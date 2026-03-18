-- ============================================================
-- AccuDocs — Migration v1.0.0 → v2.0.0
-- PostgreSQL 15+ | Run inside a single transaction
-- Apply this to an existing v1 database.
-- For a fresh install, use schema_v2.sql instead.
-- ============================================================
-- Usage:
--   psql -d accudocs -f migration_v1_to_v2.sql
--   or wrap in BEGIN/COMMIT for atomic apply
-- ============================================================

BEGIN;

-- ============================================================
-- PART 0: EXTENSIONS & SHARED FUNCTIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 1: BUG FIXES ON EXISTING OBJECTS
-- ============================================================

-- FIX 1: audit_log_invoices trigger — syntax error in string concat
-- The old trigger had:   OLD.status || to ' || NEW.status   (invalid)
-- Fixed to:              OLD.status || ' to ' || NEW.status
CREATE OR REPLACE FUNCTION trigger_audit_log_invoices()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      organization_id, entity_type, entity_id,
      action, description, new_values
    ) VALUES (
      NEW.organization_id, 'invoice', NEW.id,
      'invoice.created',
      'Invoice ' || NEW.invoice_number || ' created with status ' || NEW.status,
      row_to_json(NEW)::JSONB
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (
        organization_id, entity_type, entity_id,
        action, description, old_values, new_values
      ) VALUES (
        NEW.organization_id, 'invoice', NEW.id,
        'invoice.' || NEW.status,
        'Invoice ' || NEW.invoice_number || ' status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('status', OLD.status, 'amount_paid', OLD.amount_paid),
        jsonb_build_object('status', NEW.status, 'amount_paid', NEW.amount_paid)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger binding already exists from v1 — function replacement is enough.

-- FIX 2: invoice_number_sequences — missing table creation + updated_at trigger
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  financial_year   CHAR(4)     NOT NULL,
  last_sequence    INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inv_seq_org_fy UNIQUE (organization_id, financial_year)
);

COMMENT ON TABLE invoice_number_sequences IS
  'One row per org per FY. Use SELECT FOR UPDATE to prevent duplicate invoice numbers.';

CREATE TRIGGER set_updated_at_invoice_number_sequences
  BEFORE UPDATE ON invoice_number_sequences
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- FIX 3: clients — add CHECK (credit_limit >= 0) if not present
ALTER TABLE clients
  ADD CONSTRAINT chk_clients_credit_limit_non_negative
  CHECK (credit_limit >= 0)
  NOT VALID;
-- Validate separately to avoid long lock:
-- ALTER TABLE clients VALIDATE CONSTRAINT chk_clients_credit_limit_non_negative;

-- FIX 4: Missing index on revenue_forecasts.organization_id
CREATE INDEX IF NOT EXISTS idx_rf_org_id ON revenue_forecasts(organization_id);

-- FIX 5: Missing compound OTP auth index
CREATE INDEX IF NOT EXISTS idx_otps_mobile_active
  ON otps(mobile, is_used, expires_at)
  WHERE is_used = FALSE;

-- ============================================================
-- PART 2: MODIFY EXISTING TABLES
-- ============================================================

-- organizations: add trial_ends_at + current_subscription_id
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS current_subscription_id UUID        NULL;

COMMENT ON COLUMN organizations.trial_ends_at IS
  'If set, org is on trial until this timestamp.';
COMMENT ON COLUMN organizations.current_subscription_id IS
  'Points to active row in subscriptions. Updated by trigger.';

-- users: add brute-force protection columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS otp_attempts  SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until  TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.otp_attempts IS
  'Incremented on failed OTP. Reset on success. Lock after 5 attempts.';
COMMENT ON COLUMN users.locked_until IS
  'Account locked until this timestamp after too many OTP failures.';

CREATE INDEX IF NOT EXISTS idx_users_locked
  ON users(locked_until) WHERE locked_until IS NOT NULL;

-- documents: add checksum + is_deleted_from_s3
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS checksum            VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS is_deleted_from_s3 BOOLEAN     NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN documents.checksum IS
  'SHA-256 hex of file content. Verify integrity on download.';
COMMENT ON COLUMN documents.is_deleted_from_s3 IS
  'Set TRUE after confirmed S3 deletion to prevent double-delete.';

CREATE INDEX IF NOT EXISTS idx_docs_checksum
  ON documents(checksum) WHERE checksum IS NOT NULL;

-- invoices: add discount columns
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS discount_type   VARCHAR(10)   NULL
    CHECK (discount_type IN ('percent','flat', NULL)),
  ADD COLUMN IF NOT EXISTS discount_value  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN invoices.discount_type IS
  'percent = discount_value is %, flat = discount_value is absolute INR.';

-- tasks: convert Enums to VARCHAR + add subtask/time columns
-- 1. Convert Enums to VARCHAR to match v2 spec (prevents maintenance complexity)
ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(20) USING priority::VARCHAR;
ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR;

DROP TYPE IF EXISTS priority;
DROP TYPE IF EXISTS status;

-- 2. Map existing 'todo' to 'pending' (v2 standard)
UPDATE tasks SET status = 'pending' WHERE status = 'todo';

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_priority CHECK (priority IN ('low','medium','high','urgent'));
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('pending','in_progress','on_hold','completed','cancelled'));

-- 2. Add new columns
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id   UUID          NULL
    REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours  NUMERIC(6,2)  NULL,
  ADD COLUMN IF NOT EXISTS actual_hours     NUMERIC(6,2)  NULL;

COMMENT ON COLUMN tasks.parent_task_id IS
  'Self-referential for subtasks. Max 1 level of nesting recommended.';

CREATE INDEX IF NOT EXISTS idx_tasks_parent
  ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- notifications: Drop old and create new v2 schema
DROP TABLE IF EXISTS in_app_notifications CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  user_id          UUID          NULL     REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50)   NOT NULL
                     CHECK (type IN (
                       'invoice_issued','invoice_overdue','payment_received',
                       'document_shared','task_assigned','task_due',
                       'credit_limit_warning','risk_score_alert',
                       'subscription_expiring','subscription_expired','system'
                     )),
  title            VARCHAR(150)  NOT NULL,
  message          TEXT          NOT NULL,
  channel          VARCHAR(20)   NOT NULL DEFAULT 'in_app'
                     CHECK (channel IN ('in_app','whatsapp','email','sms')),
  is_read          BOOLEAN       NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ   NULL,
  metadata         JSONB         NOT NULL DEFAULT '{}',
  sent_at          TIMESTAMPTZ   NULL,
  delivery_status  VARCHAR(20)   NOT NULL DEFAULT 'pending'
                     CHECK (delivery_status IN ('pending','sent','delivered','failed','read')),
  error_message    TEXT          NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS
  'Notification log for in-app and WhatsApp delivery.';
COMMENT ON COLUMN notifications.type IS
  'v2: added subscription_expiring, subscription_expired types.';

-- ============================================================
-- PART 3: NEW TABLES
-- ============================================================

-- super_admins
CREATE TABLE IF NOT EXISTS super_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL UNIQUE,
  password        VARCHAR(255)  NOT NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ   NULL,
  last_login_ip   VARCHAR(45)   NULL,
  mfa_secret      VARCHAR(100)  NULL,
  mfa_enabled     BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ   NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_super_admins
  BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_super_admins_email  ON super_admins(email)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active) WHERE deleted_at IS NULL;

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan                    VARCHAR(20)   NOT NULL
                            CHECK (plan IN ('trial','starter','professional','enterprise')),
  status                  VARCHAR(20)   NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','past_due','cancelled','expired','trialing')),
  billing_cycle           VARCHAR(10)   NOT NULL DEFAULT 'monthly'
                            CHECK (billing_cycle IN ('monthly','annual')),
  amount                  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency                CHAR(3)       NOT NULL DEFAULT 'INR',
  started_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  current_period_start    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  current_period_end      TIMESTAMPTZ   NOT NULL,
  trial_end               TIMESTAMPTZ   NULL,
  cancelled_at            TIMESTAMPTZ   NULL,
  cancel_reason           TEXT          NULL,
  payment_gateway         VARCHAR(30)   NULL
                            CHECK (payment_gateway IN ('razorpay','stripe','manual',NULL)),
  gateway_subscription_id VARCHAR(100)  NULL,
  gateway_customer_id     VARCHAR(100)  NULL,
  last_payment_at         TIMESTAMPTZ   NULL,
  last_payment_amount     NUMERIC(10,2) NULL,
  next_billing_date       DATE          NULL,
  max_clients             INTEGER       NOT NULL DEFAULT 50,
  max_users               INTEGER       NOT NULL DEFAULT 5,
  max_storage_gb          INTEGER       NOT NULL DEFAULT 5,
  features                JSONB         NOT NULL DEFAULT '{}',
  metadata                JSONB         NOT NULL DEFAULT '{}',
  created_by              UUID          NULL REFERENCES super_admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_subs_org_id     ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subs_status     ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_plan       ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subs_period_end ON subscriptions(current_period_end)
  WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_subs_gateway_id ON subscriptions(gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

-- Now add the FK from organizations to subscriptions
ALTER TABLE organizations
  ADD CONSTRAINT fk_orgs_current_subscription
  FOREIGN KEY (current_subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_orgs_subscription ON organizations(current_subscription_id)
  WHERE current_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_trial_ends   ON organizations(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL AND deleted_at IS NULL;

-- client_access_tokens
CREATE TABLE IF NOT EXISTS client_access_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255)  NOT NULL UNIQUE,
  token_type      VARCHAR(20)   NOT NULL DEFAULT 'bearer'
                    CHECK (token_type IN ('bearer','refresh')),
  device_name     VARCHAR(100)  NULL,
  device_type     VARCHAR(30)   NULL
                    CHECK (device_type IN ('web','android','ios','desktop',NULL)),
  ip_address      VARCHAR(45)   NULL,
  user_agent      VARCHAR(500)  NULL,
  last_used_at    TIMESTAMPTZ   NULL,
  expires_at      TIMESTAMPTZ   NOT NULL,
  is_revoked      BOOLEAN       NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ   NULL,
  revoked_reason  VARCHAR(100)  NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_user_id        ON client_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_org_id         ON client_access_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_cat_token_hash     ON client_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_cat_expires_active ON client_access_tokens(expires_at)
  WHERE is_revoked = FALSE;

-- staff_permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permission       VARCHAR(80)   NOT NULL,
  is_granted       BOOLEAN       NOT NULL DEFAULT TRUE,
  granted_by       UUID          NOT NULL REFERENCES users(id),
  notes            TEXT          NULL,
  expires_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_perm_user_permission UNIQUE (user_id, permission)
);

CREATE TRIGGER set_updated_at_staff_permissions
  BEFORE UPDATE ON staff_permissions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sp_user_id      ON staff_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_org_id       ON staff_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sp_permission   ON staff_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_sp_user_granted ON staff_permissions(user_id, is_granted);

-- document_versions: Drop existing incorrect table and recreate
DROP TABLE IF EXISTS document_versions CASCADE;

CREATE TABLE document_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID          NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  client_id        UUID          NOT NULL REFERENCES clients(id),
  version_number   SMALLINT      NOT NULL,
  s3_key           VARCHAR(500)  NOT NULL,
  file_name        VARCHAR(255)  NOT NULL,
  original_name    VARCHAR(255)  NOT NULL,
  mime_type        VARCHAR(100)  NOT NULL,
  size_bytes       BIGINT        NOT NULL,
  checksum         VARCHAR(64)   NULL,
  change_summary   TEXT          NULL,
  uploaded_by      UUID          NOT NULL REFERENCES users(id),
  uploaded_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_dv_document_id  ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_dv_org_id       ON document_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_dv_client_id    ON document_versions(client_id);
CREATE INDEX IF NOT EXISTS idx_dv_uploaded_by  ON document_versions(uploaded_by);

-- whatsapp_message_logs: Clear old logs and create new schema
DROP TABLE IF EXISTS whatsapp_logs CASCADE;
DROP TABLE IF EXISTS whatsapp_message_logs CASCADE;

CREATE TABLE whatsapp_message_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id              UUID          NULL     REFERENCES users(id) ON DELETE SET NULL,
  client_id            UUID          NULL     REFERENCES clients(id) ON DELETE SET NULL,
  to_mobile            VARCHAR(20)   NOT NULL,
  template_name        VARCHAR(100)  NULL,
  message_type         VARCHAR(30)   NOT NULL DEFAULT 'text'
                         CHECK (message_type IN (
                           'text','template','document','image','invoice','otp','reminder','custom'
                         )),
  message_body         TEXT          NULL,
  entity_type          VARCHAR(30)   NULL,
  entity_id            UUID          NULL,
  provider             VARCHAR(30)   NOT NULL DEFAULT 'meta'
                         CHECK (provider IN ('meta','twilio','gupshup','wati','interakt','custom')),
  provider_message_id  VARCHAR(200)  NULL UNIQUE,
  provider_request_id  VARCHAR(200)  NULL,
  status               VARCHAR(20)   NOT NULL DEFAULT 'queued'
                         CHECK (status IN (
                           'queued','sent','delivered','read','failed','rejected','expired'
                         )),
  failed_reason        TEXT          NULL,
  sent_at              TIMESTAMPTZ   NULL,
  delivered_at         TIMESTAMPTZ   NULL,
  read_at              TIMESTAMPTZ   NULL,
  failed_at            TIMESTAMPTZ   NULL,
  cost_units           NUMERIC(8,4)  NULL,
  cost_currency        CHAR(3)       NULL,
  request_payload      JSONB         NULL,
  response_payload     JSONB         NULL,
  webhook_payload      JSONB         NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_whatsapp_message_logs
  BEFORE UPDATE ON whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_wml_org_id           ON whatsapp_message_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_wml_client_id        ON whatsapp_message_logs(client_id)
  WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wml_provider_msg_id  ON whatsapp_message_logs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wml_status           ON whatsapp_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_wml_to_mobile        ON whatsapp_message_logs(to_mobile);
CREATE INDEX IF NOT EXISTS idx_wml_entity           ON whatsapp_message_logs(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wml_created_at       ON whatsapp_message_logs(created_at DESC);

-- ============================================================
-- PART 4: NEW TRIGGERS
-- ============================================================

-- document_version_on_insert
CREATE OR REPLACE FUNCTION trigger_document_version_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_versions (
    document_id, organization_id, client_id,
    version_number, s3_key, file_name, original_name,
    mime_type, size_bytes, checksum, uploaded_by
  ) VALUES (
    NEW.id, NEW.organization_id, NEW.client_id,
    1, NEW.s3_key, NEW.file_name, NEW.original_name,
    NEW.mime_type, NEW.size_bytes, NEW.checksum, NEW.uploaded_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_on_insert
  AFTER INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_document_version_on_insert();

-- document_version_on_update
CREATE OR REPLACE FUNCTION trigger_document_version_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.s3_key IS DISTINCT FROM OLD.s3_key THEN
    INSERT INTO document_versions (
      document_id, organization_id, client_id,
      version_number, s3_key, file_name, original_name,
      mime_type, size_bytes, checksum, uploaded_by
    ) VALUES (
      NEW.id, NEW.organization_id, NEW.client_id,
      NEW.version, NEW.s3_key, NEW.file_name, NEW.original_name,
      NEW.mime_type, NEW.size_bytes, NEW.checksum, NEW.uploaded_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_on_update
  AFTER UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_document_version_on_update();

-- subscription_sync_to_org
CREATE OR REPLACE FUNCTION trigger_subscription_sync_to_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' OR NEW.status = 'trialing' THEN
    UPDATE organizations SET
      current_subscription_id = NEW.id,
      subscription_plan       = CASE NEW.plan
                                  WHEN 'trial' THEN 'starter'
                                  ELSE NEW.plan
                                END,
      updated_at              = NOW()
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_sync_to_org
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_subscription_sync_to_org();

-- ============================================================
-- PART 5: RLS POLICIES
-- ============================================================

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_org_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rls_bypass()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', TRUE), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER TABLE organizations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE years                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_number_sequences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_risk_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps                         ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_organizations_org  ON organizations  USING (rls_bypass() OR id = current_org_id());
CREATE POLICY rls_subscriptions_org  ON subscriptions  USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_users_org          ON users          USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_cat_org            ON client_access_tokens  USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_sp_org             ON staff_permissions     USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_clients_org        ON clients        USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_years_org          ON years          USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_folders_org        ON folders        USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_documents_org      ON documents      USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_document_versions_org ON document_versions USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_wml_org            ON whatsapp_message_logs USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_svc_tmpl_org       ON service_templates     USING (rls_bypass() OR organization_id IS NULL OR organization_id = current_org_id());
CREATE POLICY rls_inv_seq_org        ON invoice_number_sequences USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_rec_tmpl_org       ON recurring_invoice_templates USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_invoices_org       ON invoices       USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_line_items_org     ON invoice_line_items
  USING (rls_bypass() OR EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.organization_id = current_org_id()
  ));
CREATE POLICY rls_payments_org       ON payments       USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_rf_org             ON revenue_forecasts USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_crs_org            ON client_risk_scores USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_tasks_org          ON tasks          USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_notifications_org  ON notifications  USING (rls_bypass() OR organization_id = current_org_id());
CREATE POLICY rls_otps_bypass        ON otps           USING (rls_bypass());

-- ============================================================
-- PART 6: NEW FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(
  p_user_id    UUID,
  p_permission VARCHAR(80)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role       VARCHAR(20);
  v_override   BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;
  SELECT is_granted, expires_at INTO v_override, v_expires_at
  FROM staff_permissions WHERE user_id = p_user_id AND permission = p_permission LIMIT 1;
  IF FOUND THEN
    IF v_expires_at IS NULL OR v_expires_at >= NOW() THEN RETURN v_override; END IF;
  END IF;
  IF v_role = 'staff' THEN
    RETURN p_permission IN (
      'invoice.create','invoice.view','invoice.edit',
      'client.view','document.upload','document.view',
      'document.share','payment.record','payment.view',
      'task.create','task.view','task.edit'
    );
  END IF;
  IF v_role = 'client' THEN
    RETURN p_permission IN ('invoice.view_own','document.view_shared','payment.view_own');
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION revoke_expired_tokens()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE client_access_tokens
  SET is_revoked = TRUE, revoked_at = NOW(), revoked_reason = 'expired'
  WHERE expires_at < NOW() AND is_revoked = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 7: NEW VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_whatsapp_delivery_stats AS
SELECT
  organization_id,
  DATE_TRUNC('day', created_at)                AS day,
  COUNT(*)                                     AS total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'read')      AS read,
  COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('delivered','read'))::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                            AS delivery_rate_pct
FROM whatsapp_message_logs
GROUP BY organization_id, DATE_TRUNC('day', created_at);

CREATE OR REPLACE VIEW v_subscription_status AS
SELECT
  o.id                            AS organization_id,
  o.name                          AS organization_name,
  o.subscription_plan,
  s.id                            AS subscription_id,
  s.plan, s.status                AS subscription_status,
  s.current_period_end, s.trial_end,
  (s.current_period_end - NOW())  AS time_until_expiry,
  CASE
    WHEN s.current_period_end < NOW()                        THEN 'expired'
    WHEN s.current_period_end < NOW() + INTERVAL '7 days'   THEN 'expiring_soon'
    WHEN s.status = 'trialing'                               THEN 'trial'
    ELSE 'healthy'
  END                             AS health_status,
  s.max_clients, s.max_users, s.max_storage_gb,
  COUNT(DISTINCT c.id)            AS current_client_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role IN ('admin','staff')) AS current_user_count
FROM organizations o
LEFT JOIN subscriptions s ON s.id = o.current_subscription_id
LEFT JOIN clients c       ON c.organization_id = o.id AND c.deleted_at IS NULL
LEFT JOIN users u         ON u.organization_id = o.id AND u.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.subscription_plan,
         s.id, s.plan, s.status, s.current_period_end, s.trial_end,
         s.max_clients, s.max_users, s.max_storage_gb;

-- ============================================================
-- PART 8: SEED DEFAULT SUPER ADMIN
-- ============================================================

INSERT INTO super_admins (id, name, email, password, is_active)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Platform Admin',
  'admin@accudocs.in',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.K8Ih4FhQIXP.Hy',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
COMMIT;
-- ============================================================
-- Migration complete.
-- AccuDocs v1.0.0 → v2.0.0
-- ============================================================