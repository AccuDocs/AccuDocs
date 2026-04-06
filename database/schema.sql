-- ============================================================
-- AccuDocs — Complete PostgreSQL Database Schema
-- Version: 2.0.0 | PostgreSQL 15+
-- Architecture: Monolithic, multi-tenant, soft-delete everywhere
-- Updated: 2025
--
-- CHANGES FROM v1.0.0:
--   NEW TABLES (6):
--     - super_admins              (platform-level admins, separate from org users)
--     - subscriptions             (billing & plan management per org)
--     - whatsapp_message_logs     (full delivery audit for every WA message)
--     - document_versions         (immutable version history for documents)
--     - staff_permissions         (fine-grained per-staff permission overrides)
--     - client_access_tokens      (secure portal login tokens for clients)
--
--   BUG FIXES:
--     - trigger_audit_log_invoices: syntax error fixed
--         OLD.status || to ' || → OLD.status || ' to ' ||
--     - invoice_number_sequences: missing updated_at trigger added
--     - otps: missing index on (mobile, is_used, expires_at) for auth queries
--     - clients: credit_limit CHECK (>= 0) added
--     - payments: ON DELETE RESTRICT on invoice_id prevents orphan payments
--     - revenue_forecasts: missing organization_id FK index added
--
--   MODIFIED TABLES:
--     - organizations: added trial_ends_at, current_subscription_id
--     - users: added otp_attempts, locked_until (brute-force protection)
--     - documents: added checksum, is_deleted_from_s3 safety flag
--     - invoices: added discount_amount, discount_type columns
--     - tasks: added estimated_hours, actual_hours, parent_task_id (subtasks)
--
--   NEW INDEXES (14 added, see Section 4)
--
--   RLS POLICIES: Full org-scoped RLS on all tenant tables (Section 6)
--
--   TRIGGERS: Updated + 3 new triggers (Section 5)
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- SECTION 2: SHARED TRIGGER FUNCTION (updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 3: TABLES (FK-dependency order)
-- ============================================================

-- ------------------------------------------------------------
-- [NEW] TABLE: super_admins
-- Platform-level administrators completely separate from
-- org-scoped users. Can create/suspend/delete organizations,
-- manage subscriptions, impersonate firm admins.
-- SECURITY: Never expose this table via org-scoped RLS.
-- ------------------------------------------------------------
CREATE TABLE super_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  role            VARCHAR(20)   NOT NULL DEFAULT 'super_admin'
                    CHECK (role IN ('super_admin','read_only_admin')),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ   NULL,
  last_login_ip   VARCHAR(45)   NULL,
  mfa_secret      VARCHAR(100)  NULL,
  mfa_enabled     BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ   NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE super_admins IS
  'Platform-level admins. Completely isolated from org-scoped users table. No org FK by design.';

CREATE TRIGGER set_updated_at_super_admins
  BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: organizations
-- Root multi-tenant entity. One row = one CA firm.
-- v2: added trial_ends_at, current_subscription_id (FK added later)
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(150)  NOT NULL,
  slug                    VARCHAR(100)  NOT NULL UNIQUE,
  gstin                   VARCHAR(15)   NULL,
  pan                     VARCHAR(10)   NULL,
  address                 TEXT          NULL,
  state_code              CHAR(2)       NOT NULL DEFAULT '24',
  phone                   VARCHAR(20)   NULL,
  email                   VARCHAR(150)  NULL,
  logo_s3_key             VARCHAR(500)  NULL,
  bank_name               VARCHAR(150)  NULL,
  bank_account_number     VARCHAR(30)   NULL,
  bank_ifsc               VARCHAR(15)   NULL,
  bank_branch             VARCHAR(150)  NULL,
  udin                    VARCHAR(30)   NULL,
  subscription_plan       VARCHAR(20)   NOT NULL DEFAULT 'starter'
                            CHECK (subscription_plan IN ('trial','starter','professional','enterprise')),
  -- v2: trial support
  trial_ends_at           TIMESTAMPTZ   NULL,
  current_subscription_id UUID          NULL,     -- FK added after subscriptions table
  is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
  settings                JSONB         NOT NULL DEFAULT '{}',
  deleted_at              TIMESTAMPTZ   NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Root multi-tenant entity. One row per CA firm.';
COMMENT ON COLUMN organizations.settings IS
  'Firm config: invoice_prefix, default_due_days, gst_rate, whatsapp_enabled, etc.';
COMMENT ON COLUMN organizations.udin IS
  'Unique Document Identification Number for CAs (ICAI requirement)';
COMMENT ON COLUMN organizations.current_subscription_id IS
  'Points to active row in subscriptions. Updated by subscription trigger.';

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- [NEW] TABLE: subscriptions
-- Billing and plan management. One active row per org at a time.
-- Supports trial → starter → professional → enterprise upgrades.
-- ------------------------------------------------------------
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan                VARCHAR(20)   NOT NULL
                        CHECK (plan IN ('trial','starter','professional','enterprise')),
  status              VARCHAR(20)   NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','past_due','cancelled','expired','trialing')),
  billing_cycle       VARCHAR(10)   NOT NULL DEFAULT 'monthly'
                        CHECK (billing_cycle IN ('monthly','annual')),
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency            CHAR(3)       NOT NULL DEFAULT 'INR',
  started_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  current_period_end  TIMESTAMPTZ   NOT NULL,
  trial_end           TIMESTAMPTZ   NULL,
  cancelled_at        TIMESTAMPTZ   NULL,
  cancel_reason       TEXT          NULL,
  payment_gateway     VARCHAR(30)   NULL
                        CHECK (payment_gateway IN ('razorpay','stripe','manual',NULL)),
  gateway_subscription_id VARCHAR(100) NULL,
  gateway_customer_id     VARCHAR(100) NULL,
  last_payment_at     TIMESTAMPTZ   NULL,
  last_payment_amount NUMERIC(10,2) NULL,
  next_billing_date   DATE          NULL,
  max_clients         INTEGER       NOT NULL DEFAULT 50,
  max_users           INTEGER       NOT NULL DEFAULT 5,
  max_storage_gb      INTEGER       NOT NULL DEFAULT 5,
  features            JSONB         NOT NULL DEFAULT '{}',
  metadata            JSONB         NOT NULL DEFAULT '{}',
  created_by          UUID          NULL REFERENCES super_admins(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS
  'One active subscription per org. Multiple historical rows allowed. features JSONB stores plan capabilities.';
COMMENT ON COLUMN subscriptions.features IS
  'e.g. {"whatsapp":true,"recurring_invoices":true,"ai_risk_score":false}';

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Now that subscriptions exists, add the deferred FK on organizations
ALTER TABLE organizations
  ADD CONSTRAINT fk_orgs_current_subscription
  FOREIGN KEY (current_subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ------------------------------------------------------------
-- TABLE: users
-- All humans: admins, staff, and clients.
-- v2: added otp_attempts + locked_until for brute-force protection
-- ------------------------------------------------------------
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(100)  NOT NULL,
  mobile            VARCHAR(20)   NOT NULL,
  email             VARCHAR(150)  NULL,
  password          VARCHAR(255)  NULL,
  role              VARCHAR(20)   NOT NULL DEFAULT 'client'
                      CHECK (role IN ('super_admin','admin','staff','client')),
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  avatar_s3_key     VARCHAR(500)  NULL,
  last_login_at     TIMESTAMPTZ   NULL,
  -- v2: brute-force protection
  otp_attempts      SMALLINT      NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ   NULL,
  preferences       JSONB         NOT NULL DEFAULT '{}',
  deleted_at        TIMESTAMPTZ   NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_org_mobile UNIQUE (organization_id, mobile)
);

COMMENT ON TABLE users IS 'All authenticated users: admins, staff, and clients.';
COMMENT ON COLUMN users.password IS 'Nullable — WhatsApp OTP is primary auth method.';
COMMENT ON COLUMN users.otp_attempts IS 'Incremented on failed OTP. Reset on success. Lock after 5.';
COMMENT ON COLUMN users.locked_until IS 'Account locked until this timestamp after too many OTP failures.';

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: otps
-- WhatsApp OTP codes. Short-lived, cleaned by hourly cron.
-- ------------------------------------------------------------
CREATE TABLE otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      VARCHAR(20)   NOT NULL,
  otp_hash    VARCHAR(255)  NOT NULL,
  purpose     VARCHAR(30)   NOT NULL DEFAULT 'login'
                CHECK (purpose IN ('login','verify','reset')),
  expires_at  TIMESTAMPTZ   NOT NULL,
  attempts    SMALLINT      NOT NULL DEFAULT 0,
  is_used     BOOLEAN       NOT NULL DEFAULT FALSE,
  ip_address  VARCHAR(45)   NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE otps IS 'WhatsApp OTP codes. Cleaned hourly. Never store plain OTP.';

-- ------------------------------------------------------------
-- [NEW] TABLE: client_access_tokens
-- Secure stateless tokens for client portal login.
-- Issued after successful OTP verification. Supports
-- multiple active sessions, device tracking, and remote revoke.
-- ------------------------------------------------------------
CREATE TABLE client_access_tokens (
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

COMMENT ON TABLE client_access_tokens IS
  'Stateless JWT backing store. token_hash = SHA-256 of the raw token. Supports multi-device and remote revoke.';
COMMENT ON COLUMN client_access_tokens.token_hash IS
  'Never store raw token. Store SHA-256(token). Verify by hashing the incoming token and comparing.';

-- ------------------------------------------------------------
-- [NEW] TABLE: staff_permissions
-- Fine-grained permission overrides per staff user.
-- Role gives a baseline; this table adds or removes specific
-- capabilities without needing a new role enum value.
-- ------------------------------------------------------------
CREATE TABLE staff_permissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permission       VARCHAR(80)   NOT NULL,
  -- e.g. 'invoice.create', 'invoice.delete', 'client.export',
  --      'document.share', 'payment.record', 'report.view'
  is_granted       BOOLEAN       NOT NULL DEFAULT TRUE,
  -- TRUE = explicitly granted, FALSE = explicitly denied (overrides role default)
  granted_by       UUID          NOT NULL REFERENCES users(id),
  notes            TEXT          NULL,
  expires_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_perm_user_permission UNIQUE (user_id, permission)
);

COMMENT ON TABLE staff_permissions IS
  'Additive/subtractive permission overrides per staff user. Role = default; this table = exceptions.';
COMMENT ON COLUMN staff_permissions.permission IS
  'Dot-notated capability string: resource.action. e.g. invoice.delete, report.export, client.view_all';
COMMENT ON COLUMN staff_permissions.is_granted IS
  'TRUE = grant above role default. FALSE = deny even if role allows.';

CREATE TRIGGER set_updated_at_staff_permissions
  BEFORE UPDATE ON staff_permissions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: clients
-- v2: added CHECK (credit_limit >= 0)
-- ------------------------------------------------------------
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID          NOT NULL REFERENCES users(id),
  code             VARCHAR(10)   NOT NULL,
  name             VARCHAR(150)  NOT NULL,
  gstin            VARCHAR(15)   NULL,
  pan              VARCHAR(10)   NULL,
  mobile           VARCHAR(20)   NULL,
  email            VARCHAR(150)  NULL,
  address          TEXT          NULL,
  state_code       CHAR(2)       NOT NULL DEFAULT '24',
  city             VARCHAR(100)  NULL,
  pincode          VARCHAR(10)   NULL,
  credit_limit     NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
  entity_type      VARCHAR(30)   NOT NULL DEFAULT 'individual'
                     CHECK (entity_type IN (
                       'individual','proprietorship','partnership',
                       'pvt_ltd','llp','trust','huf','other'
                     )),
  notes            TEXT          NULL,
  metadata         JSONB         NOT NULL DEFAULT '{}',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  deleted_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_clients_org_code UNIQUE (organization_id, code)
);

COMMENT ON TABLE clients IS 'CA firm clients. Root FK for invoices, documents, tasks.';
COMMENT ON COLUMN clients.code IS 'Sequential code per org: 001, 002, 003...';
COMMENT ON COLUMN clients.metadata IS 'GIN indexed. Store extensible fields without schema change.';

CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: years
-- Financial years per client.
-- ------------------------------------------------------------
CREATE TABLE years (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  year             CHAR(4)       NOT NULL,
  label            VARCHAR(20)   NULL,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  notes            TEXT          NULL,
  deleted_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_years_client_year UNIQUE (client_id, year)
);

COMMENT ON TABLE years IS 'Financial year containers per client. e.g. year=2025 = FY 2024-25.';

CREATE TRIGGER set_updated_at_years
  BEFORE UPDATE ON years
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: folders
-- Document folder hierarchy.
-- ------------------------------------------------------------
CREATE TABLE folders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID          NOT NULL REFERENCES organizations(id),
  client_id         UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_id           UUID          NULL     REFERENCES years(id) ON DELETE CASCADE,
  parent_folder_id  UUID          NULL     REFERENCES folders(id) ON DELETE CASCADE,
  name              VARCHAR(150)  NOT NULL,
  slug              VARCHAR(150)  NOT NULL,
  category          VARCHAR(30)   NULL
                      CHECK (category IN ('gst','income_tax','audit','tds','roc','personal','other')),
  is_system         BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order        SMALLINT      NOT NULL DEFAULT 0,
  deleted_at        TIMESTAMPTZ   NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE folders IS 'Document folders. is_system=TRUE folders cannot be renamed/deleted by clients.';

CREATE TRIGGER set_updated_at_folders
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: documents
-- File metadata only — binaries live on S3.
-- v2: added checksum (SHA-256), is_deleted_from_s3 safety flag
-- ------------------------------------------------------------
CREATE TABLE documents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID          NOT NULL REFERENCES organizations(id),
  client_id               UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_id                 UUID          NULL     REFERENCES years(id) ON DELETE SET NULL,
  folder_id               UUID          NULL     REFERENCES folders(id) ON DELETE SET NULL,
  uploaded_by             UUID          NOT NULL REFERENCES users(id),
  file_name               VARCHAR(255)  NOT NULL,
  original_name           VARCHAR(255)  NOT NULL,
  s3_key                  VARCHAR(500)  NOT NULL UNIQUE,
  mime_type               VARCHAR(100)  NOT NULL,
  size_bytes              BIGINT        NOT NULL,
  -- v2: data integrity
  checksum                VARCHAR(64)   NULL,  -- SHA-256 hex of file content
  is_deleted_from_s3      BOOLEAN       NOT NULL DEFAULT FALSE,
  version                 SMALLINT      NOT NULL DEFAULT 1,
  parent_document_id      UUID          NULL     REFERENCES documents(id),
  tags                    JSONB         NOT NULL DEFAULT '[]',
  description             TEXT          NULL,
  is_shared_with_client   BOOLEAN       NOT NULL DEFAULT FALSE,
  shared_at               TIMESTAMPTZ   NULL,
  whatsapp_sent_at        TIMESTAMPTZ   NULL,
  whatsapp_sent_by        UUID          NULL     REFERENCES users(id),
  download_count          INTEGER       NOT NULL DEFAULT 0,
  last_accessed_at        TIMESTAMPTZ   NULL,
  deleted_at              TIMESTAMPTZ   NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'File metadata. Binary stored on AWS S3, referenced by s3_key.';
COMMENT ON COLUMN documents.checksum IS 'SHA-256 hex of file content. Verify integrity on download.';
COMMENT ON COLUMN documents.is_deleted_from_s3 IS
  'Set TRUE after confirmed S3 deletion. Prevents double-delete attempts on soft-deleted rows.';

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- [NEW] TABLE: document_versions
-- Immutable history of every document version.
-- Appended whenever a new file is uploaded for the same document.
-- Never updated or deleted — full audit trail.
-- ------------------------------------------------------------
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

COMMENT ON TABLE document_versions IS
  'Immutable version history. Append-only — never UPDATE or DELETE. version_number mirrors documents.version.';
COMMENT ON COLUMN document_versions.change_summary IS
  'Optional note from the uploader: "Updated with signed copy", "Revised FY figures", etc.';

-- ------------------------------------------------------------
-- [NEW] TABLE: whatsapp_message_logs
-- Full delivery audit for every WhatsApp message sent.
-- Separate from notifications — captures raw API response,
-- delivery webhooks, and per-message cost tracking.
-- ------------------------------------------------------------
CREATE TABLE whatsapp_message_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID          NULL     REFERENCES users(id) ON DELETE SET NULL,
  client_id        UUID          NULL     REFERENCES clients(id) ON DELETE SET NULL,
  -- Message content
  to_mobile        VARCHAR(20)   NOT NULL,
  template_name    VARCHAR(100)  NULL,
  message_type     VARCHAR(30)   NOT NULL DEFAULT 'text'
                     CHECK (message_type IN (
                       'text','template','document','image','invoice','otp','reminder','custom'
                     )),
  message_body     TEXT          NULL,
  -- Related entities
  entity_type      VARCHAR(30)   NULL,
  entity_id        UUID          NULL,
  -- Provider details
  provider         VARCHAR(30)   NOT NULL DEFAULT 'meta'
                     CHECK (provider IN ('meta','twilio','gupshup','wati','interakt','custom')),
  provider_message_id  VARCHAR(200) NULL UNIQUE,
  provider_request_id  VARCHAR(200) NULL,
  -- Delivery tracking
  status           VARCHAR(20)   NOT NULL DEFAULT 'queued'
                     CHECK (status IN (
                       'queued','sent','delivered','read','failed','rejected','expired'
                     )),
  failed_reason    TEXT          NULL,
  -- Timestamps from provider webhooks
  sent_at          TIMESTAMPTZ   NULL,
  delivered_at     TIMESTAMPTZ   NULL,
  read_at          TIMESTAMPTZ   NULL,
  failed_at        TIMESTAMPTZ   NULL,
  -- Cost tracking
  cost_units       NUMERIC(8,4)  NULL,
  cost_currency    CHAR(3)       NULL,
  -- Raw API payloads for debugging
  request_payload  JSONB         NULL,
  response_payload JSONB         NULL,
  webhook_payload  JSONB         NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_message_logs IS
  'Full WhatsApp delivery audit. Append on send, update on webhook. Never delete.';
COMMENT ON COLUMN whatsapp_message_logs.provider_message_id IS
  'Unique ID returned by WhatsApp provider. Used to match incoming delivery webhooks.';

CREATE TRIGGER set_updated_at_whatsapp_message_logs
  BEFORE UPDATE ON whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: service_templates
-- CA firm's reusable service catalogue with SAC codes.
-- ------------------------------------------------------------
CREATE TABLE service_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NULL     REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(150)  NOT NULL,
  description      TEXT          NULL,
  sac_code         VARCHAR(10)   NOT NULL,
  default_rate     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  default_gst_rate NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  is_system        BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order       SMALLINT      NOT NULL DEFAULT 0,
  deleted_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE service_templates IS 'Reusable CA service catalogue. is_system=TRUE = global templates.';
COMMENT ON COLUMN service_templates.sac_code IS 'Service Accounting Code required on GST invoices.';
COMMENT ON COLUMN service_templates.organization_id IS 'NULL for system-level global templates.';

CREATE TRIGGER set_updated_at_service_templates
  BEFORE UPDATE ON service_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: invoice_number_sequences
-- Safe concurrent invoice number generation per org per FY.
-- v2: missing updated_at trigger fixed.
-- ------------------------------------------------------------
CREATE TABLE invoice_number_sequences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  financial_year   CHAR(4)     NOT NULL,
  last_sequence    INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inv_seq_org_fy UNIQUE (organization_id, financial_year)
);

COMMENT ON TABLE invoice_number_sequences IS
  'One row per org per FY. Use SELECT FOR UPDATE to prevent duplicate invoice numbers.';

-- BUG FIX v2: This trigger was missing in v1.0.0
CREATE TRIGGER set_updated_at_invoice_number_sequences
  BEFORE UPDATE ON invoice_number_sequences
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: recurring_invoice_templates
-- Schedule-based auto invoice generation.
-- ------------------------------------------------------------
CREATE TABLE recurring_invoice_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name                  VARCHAR(150)  NOT NULL,
  frequency             VARCHAR(20)   NOT NULL
                          CHECK (frequency IN ('MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY')),
  next_run_date         DATE          NOT NULL,
  advance_notice_days   SMALLINT      NOT NULL DEFAULT 5,
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  auto_issue            BOOLEAN       NOT NULL DEFAULT FALSE,
  line_items_snapshot   JSONB         NOT NULL DEFAULT '[]',
  default_notes         TEXT          NULL,
  default_due_days      SMALLINT      NOT NULL DEFAULT 30,
  total_generated       INTEGER       NOT NULL DEFAULT 0,
  last_generated_at     TIMESTAMPTZ   NULL,
  deleted_at            TIMESTAMPTZ   NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recurring_invoice_templates IS
  'Auto-generate invoices on schedule. Cron checks next_run_date daily.';

CREATE TRIGGER set_updated_at_recurring_invoice_templates
  BEFORE UPDATE ON recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: invoices
-- v2: added discount_amount, discount_type columns
-- State machine: draft→issued→partially_paid/paid/overdue/cancelled
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id               UUID          NOT NULL REFERENCES clients(id),
  recurring_template_id   UUID          NULL     REFERENCES recurring_invoice_templates(id) ON DELETE SET NULL,

  -- Identity
  invoice_number          VARCHAR(30)   NOT NULL,
  CONSTRAINT uq_invoices_org_number UNIQUE (organization_id, invoice_number),

  -- Status state machine
  status                  VARCHAR(20)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN (
                              'draft','issued','partially_paid','paid','overdue','cancelled'
                            )),

  -- Dates
  invoice_date            DATE          NOT NULL,
  due_date                DATE          NOT NULL,
  issued_at               TIMESTAMPTZ   NULL,
  paid_at                 TIMESTAMPTZ   NULL,
  cancelled_at            TIMESTAMPTZ   NULL,

  -- GST
  gst_type                VARCHAR(15)   NOT NULL DEFAULT 'CGST_SGST'
                            CHECK (gst_type IN ('CGST_SGST','IGST')),
  place_of_supply         CHAR(2)       NOT NULL DEFAULT '24',
  client_gstin            VARCHAR(15)   NULL,
  firm_gstin              VARCHAR(15)   NULL,

  -- v2: discount support
  discount_type           VARCHAR(10)   NULL
                            CHECK (discount_type IN ('percent','flat', NULL)),
  discount_value          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_amount         NUMERIC(12,2) NOT NULL DEFAULT 0.00,

  -- Amounts (NUMERIC only, never FLOAT)
  subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cgst_amount             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sgst_amount             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  igst_amount             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  round_off               NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
  total_amount            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  amount_paid             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  balance_due             NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- Content
  notes                   TEXT          NULL,
  cancel_reason           TEXT          NULL,
  internal_notes          TEXT          NULL,

  -- PDF & delivery
  pdf_s3_key              VARCHAR(500)  NULL,
  pdf_generated_at        TIMESTAMPTZ   NULL,
  whatsapp_sent_at        TIMESTAMPTZ   NULL,
  whatsapp_sent_by        UUID          NULL REFERENCES users(id),
  email_sent_at           TIMESTAMPTZ   NULL,

  -- Audit trail
  created_by              UUID          NOT NULL REFERENCES users(id),
  issued_by               UUID          NULL     REFERENCES users(id),
  cancelled_by            UUID          NULL     REFERENCES users(id),

  deleted_at              TIMESTAMPTZ   NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Master invoice record. Central billing entity.';
COMMENT ON COLUMN invoices.balance_due IS
  'Generated column: total_amount - amount_paid. Never update directly.';
COMMENT ON COLUMN invoices.discount_type IS
  'percent = discount_value is %, flat = discount_value is absolute INR amount.';

CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: invoice_line_items
-- ------------------------------------------------------------
CREATE TABLE invoice_line_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_template_id UUID          NULL     REFERENCES service_templates(id) ON DELETE SET NULL,
  description         VARCHAR(255)  NOT NULL,
  sac_code            VARCHAR(10)   NOT NULL,
  quantity            NUMERIC(8,2)  NOT NULL DEFAULT 1.00,
  unit_rate           NUMERIC(10,2) NOT NULL,
  amount              NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  sort_order          SMALLINT      NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoice_line_items IS
  'One row per service on an invoice. amount = qty × rate (generated).';

CREATE TRIGGER set_updated_at_invoice_line_items
  BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: payments
-- v2: ON DELETE RESTRICT explicitly documented on invoice_id.
-- This was implicit in v1 but now clearly enforced.
-- ------------------------------------------------------------
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  invoice_id       UUID          NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  client_id        UUID          NOT NULL REFERENCES clients(id),
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date     DATE          NOT NULL,
  payment_mode     VARCHAR(30)   NOT NULL DEFAULT 'bank_transfer'
                     CHECK (payment_mode IN (
                       'cash','cheque','bank_transfer','upi','neft','rtgs','other'
                     )),
  reference_number VARCHAR(100)  NULL,
  notes            TEXT          NULL,
  recorded_by      UUID          NOT NULL REFERENCES users(id),
  deleted_at       TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS
  'Payment records. Each row updates invoice.amount_paid via trigger.';
COMMENT ON COLUMN payments.reference_number IS
  'UTR number, cheque number, UPI transaction ID, etc.';

CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: revenue_forecasts (insert-only)
-- ------------------------------------------------------------
CREATE TABLE revenue_forecasts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_date           DATE          NOT NULL,
  period_days             SMALLINT      NOT NULL CHECK (period_days IN (30,60,90)),
  forecasted_amount       NUMERIC(14,2) NOT NULL,
  confidence_score        NUMERIC(4,2)  NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  historical_component    NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  recurring_component     NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  outstanding_component   NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  calculation_inputs      JSONB         NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_forecast_org_date_period UNIQUE (organization_id, forecast_date, period_days)
);

COMMENT ON TABLE revenue_forecasts IS
  'Immutable forecast snapshots. Insert-only — never update rows.';

-- ------------------------------------------------------------
-- TABLE: client_risk_scores (insert-only)
-- ------------------------------------------------------------
CREATE TABLE client_risk_scores (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID          NOT NULL REFERENCES organizations(id),
  client_id                   UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  score                       SMALLINT      NOT NULL CHECK (score BETWEEN 0 AND 100),
  ltv_segment                 VARCHAR(10)   NOT NULL DEFAULT 'LOW'
                                CHECK (ltv_segment IN ('LOW','MEDIUM','HIGH')),
  payment_history_score       SMALLINT      NOT NULL DEFAULT 0,
  overdue_frequency_score     SMALLINT      NOT NULL DEFAULT 0,
  consistency_score           SMALLINT      NOT NULL DEFAULT 0,
  credit_utilization_score    SMALLINT      NOT NULL DEFAULT 0,
  avg_days_to_pay             NUMERIC(5,1)  NULL,
  overdue_rate_pct            NUMERIC(5,2)  NULL,
  current_outstanding         NUMERIC(12,2) NULL,
  credit_limit_used           NUMERIC(12,2) NULL,
  two_year_revenue            NUMERIC(14,2) NULL,
  projected_three_year_revenue NUMERIC(14,2) NULL,
  calculated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE client_risk_scores IS
  'Immutable risk score snapshots. Insert-only. Score 0=risky, 100=reliable.';

-- ------------------------------------------------------------
-- TABLE: tasks
-- v2: added estimated_hours, actual_hours, parent_task_id (subtasks)
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           UUID          NULL     REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to         UUID          NULL     REFERENCES users(id) ON DELETE SET NULL,
  created_by          UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- v2: subtask support
  parent_task_id      UUID          NULL     REFERENCES tasks(id) ON DELETE SET NULL,
  title               VARCHAR(255)  NOT NULL,
  description         TEXT          NULL,
  priority            VARCHAR(10)   NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('high','medium','low')),
  status              VARCHAR(20)   NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo','in_progress','review','done')),
  due_date            TIMESTAMPTZ   NULL,
  -- v2: time tracking
  estimated_hours     NUMERIC(6,2)  NULL,
  actual_hours        NUMERIC(6,2)  NULL,
  tags                JSONB         NOT NULL DEFAULT '[]',
  completed_at        TIMESTAMPTZ   NULL,
  related_invoice_id  UUID          NULL REFERENCES invoices(id) ON DELETE SET NULL,
  related_document_id UUID          NULL REFERENCES documents(id) ON DELETE SET NULL,
  deleted_at          TIMESTAMPTZ   NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS
  'Work tracker for CA staff. completed_at auto-set by trigger on status=done.';
COMMENT ON COLUMN tasks.parent_task_id IS
  'Self-referential for subtasks. Max 1 level of nesting recommended.';

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: notifications
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- TABLE: audit_logs
-- Immutable append-only audit trail.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NULL REFERENCES organizations(id) ON DELETE SET NULL,
  user_id          UUID          NULL REFERENCES users(id) ON DELETE SET NULL,
  super_admin_id   UUID          NULL REFERENCES super_admins(id) ON DELETE SET NULL,
  action           VARCHAR(80)   NOT NULL,
  entity_type      VARCHAR(50)   NOT NULL,
  entity_id        UUID          NULL,
  description      TEXT          NOT NULL,
  old_values       JSONB         NULL,
  new_values       JSONB         NULL,
  ip_address       VARCHAR(45)   NULL,
  user_agent       VARCHAR(500)  NULL,
  request_id       VARCHAR(50)   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS
  'Immutable audit trail. Append-only — never UPDATE or DELETE rows.';

-- ------------------------------------------------------------
-- TENANT INTEGRITY CONSTRAINTS
-- Enforce that child records cannot point across organizations.
-- ------------------------------------------------------------
ALTER TABLE users
  ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id);

ALTER TABLE clients
  ADD CONSTRAINT uq_clients_id_org UNIQUE (id, organization_id),
  ADD CONSTRAINT fk_clients_user_org
    FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id);

ALTER TABLE folders
  ADD CONSTRAINT uq_folders_id_org UNIQUE (id, organization_id),
  ADD CONSTRAINT fk_folders_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE years
  ADD CONSTRAINT fk_years_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE documents
  ADD CONSTRAINT fk_documents_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_documents_folder_org
    FOREIGN KEY (folder_id, organization_id)
    REFERENCES folders(id, organization_id)
    ON DELETE SET NULL;

ALTER TABLE recurring_invoice_templates
  ADD CONSTRAINT fk_recurring_templates_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id);

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_client_org
    FOREIGN KEY (client_id, organization_id)
    REFERENCES clients(id, organization_id)
    ON DELETE CASCADE;

-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- super_admins
CREATE INDEX idx_super_admins_email    ON super_admins(email)     WHERE deleted_at IS NULL;
CREATE INDEX idx_super_admins_active   ON super_admins(is_active) WHERE deleted_at IS NULL;

-- organizations
CREATE INDEX idx_orgs_slug             ON organizations(slug)      WHERE deleted_at IS NULL;
CREATE INDEX idx_orgs_is_active        ON organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_orgs_pan              ON organizations(pan)        WHERE pan IS NOT NULL;
-- v2: new
CREATE INDEX idx_orgs_subscription     ON organizations(current_subscription_id)
  WHERE current_subscription_id IS NOT NULL;
CREATE INDEX idx_orgs_trial_ends       ON organizations(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL AND deleted_at IS NULL;

-- subscriptions
CREATE INDEX idx_subs_org_id           ON subscriptions(organization_id);
CREATE INDEX idx_subs_status           ON subscriptions(status);
CREATE INDEX idx_subs_plan             ON subscriptions(plan);
CREATE INDEX idx_subs_period_end       ON subscriptions(current_period_end)
  WHERE status IN ('active','trialing');
CREATE INDEX idx_subs_gateway_id       ON subscriptions(gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

-- users
CREATE INDEX idx_users_org_id          ON users(organization_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_mobile          ON users(mobile)            WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role            ON users(role)              WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active       ON users(is_active)         WHERE deleted_at IS NULL;
-- v2: new
CREATE INDEX idx_users_locked          ON users(locked_until)
  WHERE locked_until IS NOT NULL;

-- otps
CREATE INDEX idx_otps_mobile           ON otps(mobile);
CREATE INDEX idx_otps_expires_at       ON otps(expires_at);
-- v2: new — compound index for the auth query pattern
CREATE INDEX idx_otps_mobile_active    ON otps(mobile, is_used, expires_at)
  WHERE is_used = FALSE;

-- client_access_tokens
CREATE INDEX idx_cat_user_id           ON client_access_tokens(user_id);
CREATE INDEX idx_cat_org_id            ON client_access_tokens(organization_id);
CREATE INDEX idx_cat_token_hash        ON client_access_tokens(token_hash);
CREATE INDEX idx_cat_expires_active    ON client_access_tokens(expires_at)
  WHERE is_revoked = FALSE;

-- staff_permissions
CREATE INDEX idx_sp_user_id            ON staff_permissions(user_id);
CREATE INDEX idx_sp_org_id             ON staff_permissions(organization_id);
CREATE INDEX idx_sp_permission         ON staff_permissions(permission);
CREATE INDEX idx_sp_user_granted       ON staff_permissions(user_id, is_granted);

-- clients
CREATE INDEX idx_clients_org_id        ON clients(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_user_id       ON clients(user_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_is_active     ON clients(is_active)       WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_gstin         ON clients(gstin)            WHERE gstin IS NOT NULL;
CREATE INDEX idx_clients_org_active    ON clients(organization_id, is_active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_metadata      ON clients USING GIN(metadata);
CREATE INDEX idx_clients_name_trgm     ON clients USING GIN(name gin_trgm_ops);
CREATE INDEX idx_clients_mobile_trgm   ON clients USING GIN(mobile gin_trgm_ops)
  WHERE mobile IS NOT NULL;

-- years
CREATE INDEX idx_years_client_id       ON years(client_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_years_org_id          ON years(organization_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_years_year            ON years(year)              WHERE deleted_at IS NULL;

-- folders
CREATE INDEX idx_folders_client_id     ON folders(client_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_year_id       ON folders(year_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_parent        ON folders(parent_folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_org_id        ON folders(organization_id) WHERE deleted_at IS NULL;

-- documents
CREATE INDEX idx_docs_client_year      ON documents(client_id, year_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_folder_id        ON documents(folder_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_org_uploader     ON documents(organization_id, uploaded_by)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_s3_key           ON documents(s3_key);
CREATE INDEX idx_docs_parent           ON documents(parent_document_id)
  WHERE parent_document_id IS NOT NULL;
CREATE INDEX idx_docs_shared           ON documents(is_shared_with_client)
  WHERE deleted_at IS NULL AND is_shared_with_client = TRUE;
CREATE INDEX idx_docs_tags             ON documents USING GIN(tags);
-- v2: new
CREATE INDEX idx_docs_checksum         ON documents(checksum) WHERE checksum IS NOT NULL;

-- document_versions
CREATE INDEX idx_dv_document_id        ON document_versions(document_id);
CREATE INDEX idx_dv_org_id             ON document_versions(organization_id);
CREATE INDEX idx_dv_client_id          ON document_versions(client_id);
CREATE INDEX idx_dv_uploaded_by        ON document_versions(uploaded_by);

-- whatsapp_message_logs
CREATE INDEX idx_wml_org_id            ON whatsapp_message_logs(organization_id);
CREATE INDEX idx_wml_client_id         ON whatsapp_message_logs(client_id)
  WHERE client_id IS NOT NULL;
CREATE INDEX idx_wml_provider_msg_id   ON whatsapp_message_logs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_wml_status            ON whatsapp_message_logs(status);
CREATE INDEX idx_wml_to_mobile         ON whatsapp_message_logs(to_mobile);
CREATE INDEX idx_wml_entity            ON whatsapp_message_logs(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;
CREATE INDEX idx_wml_created_at        ON whatsapp_message_logs(created_at DESC);

-- service_templates
CREATE INDEX idx_svc_tmpl_org_id       ON service_templates(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_svc_tmpl_active       ON service_templates(is_active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_svc_tmpl_sac          ON service_templates(sac_code);

-- invoice_number_sequences
CREATE INDEX idx_inv_seq_org_fy        ON invoice_number_sequences(organization_id, financial_year);

-- recurring_invoice_templates
CREATE INDEX idx_rec_client_id         ON recurring_invoice_templates(client_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_rec_org_id            ON recurring_invoice_templates(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_rec_active_due        ON recurring_invoice_templates(next_run_date)
  WHERE is_active = TRUE AND deleted_at IS NULL;

-- invoices
CREATE INDEX idx_inv_org_client        ON invoices(organization_id, client_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_status            ON invoices(status)       WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_invoice_date      ON invoices(invoice_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_due_date          ON invoices(due_date)     WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_client_status     ON invoices(client_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_recurring         ON invoices(recurring_template_id)
  WHERE recurring_template_id IS NOT NULL;
CREATE INDEX idx_inv_overdue           ON invoices(due_date, status)
  WHERE status IN ('issued','partially_paid') AND deleted_at IS NULL;

-- invoice_line_items
CREATE INDEX idx_line_invoice_id       ON invoice_line_items(invoice_id);
CREATE INDEX idx_line_template_id      ON invoice_line_items(service_template_id)
  WHERE service_template_id IS NOT NULL;

-- payments
CREATE INDEX idx_pay_invoice_id        ON payments(invoice_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_client_id         ON payments(client_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_org_id            ON payments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_date              ON payments(payment_date)    WHERE deleted_at IS NULL;

-- revenue_forecasts
CREATE INDEX idx_rf_org_date           ON revenue_forecasts(organization_id, forecast_date DESC);
-- v2 BUG FIX: this index was missing in v1
CREATE INDEX idx_rf_org_id             ON revenue_forecasts(organization_id);

-- client_risk_scores
CREATE INDEX idx_crs_client_date       ON client_risk_scores(client_id, calculated_at DESC);
CREATE INDEX idx_crs_org_id            ON client_risk_scores(organization_id);
CREATE INDEX idx_crs_score             ON client_risk_scores(score);
CREATE INDEX idx_crs_ltv               ON client_risk_scores(ltv_segment);

-- tasks
CREATE INDEX idx_tasks_org_assigned    ON tasks(organization_id, assigned_to)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_org_client      ON tasks(organization_id, client_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status          ON tasks(status)   WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority        ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date        ON tasks(due_date)
  WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_client_status   ON tasks(client_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority_due    ON tasks(priority, due_date)
  WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_tags            ON tasks USING GIN(tags);
-- v2: new
CREATE INDEX idx_tasks_parent          ON tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- notifications
CREATE INDEX idx_notif_user_read       ON notifications(user_id, is_read);
CREATE INDEX idx_notif_org_type        ON notifications(organization_id, type);
CREATE INDEX idx_notif_sent_at         ON notifications(sent_at);

-- audit_logs
CREATE INDEX idx_audit_org_entity      ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_user_id         ON audit_logs(user_id);
CREATE INDEX idx_audit_super_admin_id  ON audit_logs(super_admin_id);
CREATE INDEX idx_audit_action          ON audit_logs(action);
CREATE INDEX idx_audit_created_at      ON audit_logs(created_at);
CREATE INDEX idx_audit_entity_id       ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;

-- ============================================================
-- SECTION 5: TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- TRIGGER: tasks_completed_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_tasks_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_tasks_completed_at();

-- ------------------------------------------------------------
-- TRIGGER: update_invoice_payment_status
-- After INSERT/UPDATE/DELETE on payments, recalculate invoice.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id     UUID;
  v_total_amount   NUMERIC(12,2);
  v_total_paid     NUMERIC(12,2);
  v_new_status     VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT
    i.total_amount,
    COALESCE(SUM(p.amount), 0)
  INTO v_total_amount, v_total_paid
  FROM invoices i
  LEFT JOIN payments p
    ON p.invoice_id = i.id
    AND p.deleted_at IS NULL
  WHERE i.id = v_invoice_id
  GROUP BY i.total_amount;

  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    SELECT CASE
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'issued'
    END INTO v_new_status
    FROM invoices WHERE id = v_invoice_id;
  END IF;

  UPDATE invoices SET
    amount_paid = v_total_paid,
    status      = v_new_status,
    paid_at     = CASE
                    WHEN v_new_status = 'paid' AND paid_at IS NULL THEN NOW()
                    ELSE paid_at
                  END,
    updated_at  = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_invoice_payment_status();

-- ------------------------------------------------------------
-- TRIGGER: audit_log_invoices
-- BUG FIX v2: syntax error in string concat was:
--   OLD.status || to ' || NEW.status
-- Fixed to:
--   OLD.status || ' to ' || NEW.status
-- ------------------------------------------------------------
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
        -- BUG FIX: was "|| to '" which is invalid SQL syntax
        'Invoice ' || NEW.invoice_number || ' status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('status', OLD.status, 'amount_paid', OLD.amount_paid),
        jsonb_build_object('status', NEW.status, 'amount_paid', NEW.amount_paid)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_invoices
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log_invoices();

-- ------------------------------------------------------------
-- [NEW] TRIGGER: document_version_on_update
-- Whenever a document row is updated with a new s3_key
-- (i.e. a new file version is uploaded), automatically
-- append a row to document_versions.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- [NEW] TRIGGER: document_version_on_insert
-- Capture version 1 on document creation.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- [NEW] TRIGGER: subscription_sync_to_org
-- When a subscription becomes active, update
-- organizations.current_subscription_id and subscription_plan.
-- ------------------------------------------------------------
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
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Pattern: every policy uses current_setting('app.current_org_id')
-- which the application MUST set at the start of every transaction:
--   SET LOCAL app.current_org_id = '<org_uuid>';
--
-- super_admin bypass: set app.bypass_rls = 'true' for platform ops.
-- Never enable RLS on audit_logs or super_admins.
-- ============================================================

-- Helper function to get current org from session variable
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_org_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper to check super-admin bypass flag
CREATE OR REPLACE FUNCTION rls_bypass()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', TRUE), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tenant-scoped tables
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

-- organizations: org can only see itself
CREATE POLICY rls_organizations_org ON organizations
  USING (rls_bypass() OR id = current_org_id());

-- subscriptions
CREATE POLICY rls_subscriptions_org ON subscriptions
  USING (rls_bypass() OR organization_id = current_org_id());

-- users
CREATE POLICY rls_users_org ON users
  USING (rls_bypass() OR organization_id = current_org_id());

-- client_access_tokens
CREATE POLICY rls_cat_org ON client_access_tokens
  USING (rls_bypass() OR organization_id = current_org_id());

-- staff_permissions
CREATE POLICY rls_sp_org ON staff_permissions
  USING (rls_bypass() OR organization_id = current_org_id());

-- clients
CREATE POLICY rls_clients_org ON clients
  USING (rls_bypass() OR organization_id = current_org_id());

-- years
CREATE POLICY rls_years_org ON years
  USING (rls_bypass() OR organization_id = current_org_id());

-- folders
CREATE POLICY rls_folders_org ON folders
  USING (rls_bypass() OR organization_id = current_org_id());

-- documents
CREATE POLICY rls_documents_org ON documents
  USING (rls_bypass() OR organization_id = current_org_id());

-- document_versions
CREATE POLICY rls_document_versions_org ON document_versions
  USING (rls_bypass() OR organization_id = current_org_id());

-- whatsapp_message_logs
CREATE POLICY rls_wml_org ON whatsapp_message_logs
  USING (rls_bypass() OR organization_id = current_org_id());

-- service_templates: own org OR system templates (organization_id IS NULL)
CREATE POLICY rls_svc_tmpl_org ON service_templates
  USING (rls_bypass() OR organization_id IS NULL OR organization_id = current_org_id());

-- invoice_number_sequences
CREATE POLICY rls_inv_seq_org ON invoice_number_sequences
  USING (rls_bypass() OR organization_id = current_org_id());

-- recurring_invoice_templates
CREATE POLICY rls_rec_tmpl_org ON recurring_invoice_templates
  USING (rls_bypass() OR organization_id = current_org_id());

-- invoices
CREATE POLICY rls_invoices_org ON invoices
  USING (rls_bypass() OR organization_id = current_org_id());

-- invoice_line_items: join through invoice
CREATE POLICY rls_line_items_org ON invoice_line_items
  USING (
    rls_bypass() OR
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = current_org_id()
    )
  );

-- payments
CREATE POLICY rls_payments_org ON payments
  USING (rls_bypass() OR organization_id = current_org_id());

-- revenue_forecasts
CREATE POLICY rls_rf_org ON revenue_forecasts
  USING (rls_bypass() OR organization_id = current_org_id());

-- client_risk_scores
CREATE POLICY rls_crs_org ON client_risk_scores
  USING (rls_bypass() OR organization_id = current_org_id());

-- tasks
CREATE POLICY rls_tasks_org ON tasks
  USING (rls_bypass() OR organization_id = current_org_id());

-- notifications
CREATE POLICY rls_notifications_org ON notifications
  USING (rls_bypass() OR organization_id = current_org_id());

-- otps: scoped by mobile (no org), only allow bypass or direct match
-- Application should query by mobile directly; bypass for admin cleanup jobs
CREATE POLICY rls_otps_bypass ON otps
  USING (rls_bypass());

-- ============================================================
-- SECTION 7: VIEWS
-- ============================================================

-- v_client_summary (unchanged from v1 — logic is correct)
CREATE OR REPLACE VIEW v_client_summary AS
SELECT
  c.id                                                              AS client_id,
  c.organization_id,
  c.code                                                            AS client_code,
  c.name                                                            AS client_name,
  c.gstin,
  c.pan,
  c.entity_type,
  u.mobile                                                          AS client_mobile,
  c.is_active,
  c.credit_limit,
  COUNT(DISTINCT y.id)                                              AS year_count,
  COUNT(DISTINCT d.id)                                              AS document_count,
  COUNT(DISTINCT inv.id)                                            AS invoice_count,
  COALESCE(SUM(inv.total_amount) FILTER (WHERE inv.status = 'paid'), 0)
                                                                    AS total_billed_paid,
  COALESCE(SUM(inv.balance_due) FILTER (
    WHERE inv.status IN ('issued','partially_paid','overdue')), 0)  AS total_outstanding,
  crs.score                                                         AS latest_risk_score,
  crs.ltv_segment,
  crs.calculated_at                                                 AS risk_calculated_at,
  c.created_at
FROM clients c
JOIN users u ON c.user_id = u.id
LEFT JOIN years y       ON y.client_id = c.id    AND y.deleted_at IS NULL
LEFT JOIN documents d   ON d.client_id = c.id    AND d.deleted_at IS NULL
LEFT JOIN invoices inv  ON inv.client_id = c.id  AND inv.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT score, ltv_segment, calculated_at
  FROM client_risk_scores
  WHERE client_id = c.id
  ORDER BY calculated_at DESC
  LIMIT 1
) crs ON TRUE
WHERE c.deleted_at IS NULL
GROUP BY
  c.id, c.organization_id, c.code, c.name, c.gstin, c.pan,
  c.entity_type, u.mobile, c.is_active, c.credit_limit,
  crs.score, crs.ltv_segment, crs.calculated_at, c.created_at;

-- v_billing_metrics (unchanged)
CREATE OR REPLACE VIEW v_billing_metrics AS
SELECT
  organization_id,
  COUNT(*)                                                          AS total_invoices,
  COUNT(*) FILTER (WHERE status = 'draft')                         AS draft_count,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'draft'), 0)   AS draft_value,
  COUNT(*) FILTER (WHERE status = 'issued')                        AS issued_count,
  COUNT(*) FILTER (WHERE status = 'partially_paid')                AS partially_paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue')                       AS overdue_count,
  COUNT(*) FILTER (WHERE status = 'paid')                          AS paid_count,
  COALESCE(SUM(balance_due) FILTER (
    WHERE status IN ('issued','partially_paid','overdue')), 0)      AS total_outstanding,
  COALESCE(SUM(balance_due) FILTER (WHERE status = 'overdue'), 0)  AS total_overdue,
  COALESCE(SUM(total_amount) FILTER (
    WHERE status = 'paid'
      AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())
  ), 0)                                                             AS collected_this_month,
  COALESCE(SUM(total_amount) FILTER (
    WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', NOW())
  ), 0)                                                             AS billed_this_month
FROM invoices
WHERE deleted_at IS NULL
GROUP BY organization_id;

-- v_overdue_invoices (unchanged)
CREATE OR REPLACE VIEW v_overdue_invoices AS
SELECT
  inv.id                                    AS invoice_id,
  inv.organization_id,
  inv.invoice_number,
  inv.due_date,
  inv.balance_due,
  inv.total_amount,
  inv.whatsapp_sent_at,
  (CURRENT_DATE - inv.due_date)             AS days_overdue,
  c.id                                      AS client_id,
  c.name                                    AS client_name,
  c.gstin                                   AS client_gstin,
  u.mobile                                  AS client_mobile,
  crs.ltv_segment
FROM invoices inv
JOIN clients c  ON inv.client_id = c.id
JOIN users u    ON c.user_id = u.id
LEFT JOIN LATERAL (
  SELECT ltv_segment
  FROM client_risk_scores
  WHERE client_id = c.id
  ORDER BY calculated_at DESC
  LIMIT 1
) crs ON TRUE
WHERE inv.status = 'overdue'
  AND inv.deleted_at IS NULL
  AND c.deleted_at IS NULL
ORDER BY days_overdue DESC;

-- v_recurring_due_today (unchanged)
CREATE OR REPLACE VIEW v_recurring_due_today AS
SELECT
  rt.id                   AS template_id,
  rt.organization_id,
  rt.client_id,
  rt.name                 AS template_name,
  rt.frequency,
  rt.next_run_date,
  rt.advance_notice_days,
  rt.auto_issue,
  rt.line_items_snapshot,
  rt.default_notes,
  rt.default_due_days,
  c.name                  AS client_name,
  u.mobile                AS client_mobile,
  c.gstin                 AS client_gstin,
  c.state_code            AS client_state_code
FROM recurring_invoice_templates rt
JOIN clients c ON rt.client_id = c.id
JOIN users u   ON c.user_id = u.id
WHERE rt.next_run_date <= CURRENT_DATE
  AND rt.is_active = TRUE
  AND rt.deleted_at IS NULL
  AND c.deleted_at IS NULL;

-- v_dashboard_summary (unchanged)
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  o.id                                                              AS organization_id,
  o.name                                                            AS organization_name,
  COUNT(DISTINCT c.id)                                              AS total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = TRUE)           AS active_clients,
  COUNT(DISTINCT d.id)                                              AS total_documents,
  COUNT(DISTINCT inv.id)                                            AS total_invoices,
  COALESCE(SUM(inv.balance_due) FILTER (
    WHERE inv.status IN ('issued','partially_paid','overdue')), 0)  AS outstanding_amount,
  COALESCE(SUM(inv.balance_due) FILTER (
    WHERE inv.status = 'overdue'), 0)                               AS overdue_amount,
  COALESCE(SUM(inv.total_amount) FILTER (
    WHERE inv.status = 'paid'
      AND DATE_TRUNC('month', inv.paid_at) = DATE_TRUNC('month', NOW())
  ), 0)                                                             AS collected_this_month,
  COUNT(inv.id) FILTER (WHERE inv.status = 'draft')                AS draft_invoices,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done')           AS open_tasks,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status != 'done'
      AND t.due_date IS NOT NULL
      AND t.due_date < NOW()
  )                                                                 AS overdue_tasks
FROM organizations o
LEFT JOIN clients c    ON c.organization_id = o.id AND c.deleted_at IS NULL
LEFT JOIN documents d  ON d.organization_id = o.id AND d.deleted_at IS NULL
LEFT JOIN invoices inv ON inv.organization_id = o.id AND inv.deleted_at IS NULL
LEFT JOIN tasks t      ON t.organization_id = o.id AND t.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name;

-- [NEW] v_whatsapp_delivery_stats
-- Per-org WhatsApp delivery rate dashboard.
CREATE OR REPLACE VIEW v_whatsapp_delivery_stats AS
SELECT
  organization_id,
  DATE_TRUNC('day', created_at)               AS day,
  COUNT(*)                                    AS total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'read')      AS read,
  COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('delivered','read'))::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                           AS delivery_rate_pct
FROM whatsapp_message_logs
GROUP BY organization_id, DATE_TRUNC('day', created_at);

-- [NEW] v_subscription_status
-- Current subscription health per org. Used by billing cron.
CREATE OR REPLACE VIEW v_subscription_status AS
SELECT
  o.id                              AS organization_id,
  o.name                            AS organization_name,
  o.subscription_plan,
  s.id                              AS subscription_id,
  s.plan,
  s.status                          AS subscription_status,
  s.current_period_end,
  s.trial_end,
  (s.current_period_end - NOW())    AS time_until_expiry,
  CASE
    WHEN s.current_period_end < NOW()    THEN 'expired'
    WHEN s.current_period_end < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN s.status = 'trialing'           THEN 'trial'
    ELSE 'healthy'
  END                               AS health_status,
  s.max_clients,
  s.max_users,
  s.max_storage_gb,
  COUNT(DISTINCT c.id)              AS current_client_count,
  COUNT(DISTINCT u.id) FILTER (
    WHERE u.role IN ('admin','staff')
  )                                 AS current_user_count
FROM organizations o
LEFT JOIN subscriptions s ON s.id = o.current_subscription_id
LEFT JOIN clients c       ON c.organization_id = o.id AND c.deleted_at IS NULL
LEFT JOIN users u         ON u.organization_id = o.id AND u.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.subscription_plan,
         s.id, s.plan, s.status, s.current_period_end,
         s.trial_end, s.max_clients, s.max_users, s.max_storage_gb;

-- ============================================================
-- SECTION 8: FUNCTIONS
-- ============================================================

-- calculate_financial_year (unchanged — correct)
CREATE OR REPLACE FUNCTION calculate_financial_year(check_date DATE)
RETURNS CHAR(4) AS $$
DECLARE
  y  INT;
  m  INT;
  fy CHAR(4);
BEGIN
  y := EXTRACT(YEAR FROM check_date)::INT;
  m := EXTRACT(MONTH FROM check_date)::INT;
  IF m >= 4 THEN
    fy := LPAD((y MOD 100)::TEXT, 2, '0') || LPAD(((y + 1) MOD 100)::TEXT, 2, '0');
  ELSE
    fy := LPAD(((y - 1) MOD 100)::TEXT, 2, '0') || LPAD((y MOD 100)::TEXT, 2, '0');
  END IF;
  RETURN fy;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_financial_year(DATE) IS
  'Returns 4-char FY code (e.g. 2526). Indian FY starts April 1.';

-- get_next_invoice_number (unchanged — correct)
CREATE OR REPLACE FUNCTION get_next_invoice_number(
  p_org_id UUID,
  p_fy     CHAR(4)
)
RETURNS VARCHAR AS $$
DECLARE
  v_seq    INTEGER;
  v_prefix VARCHAR(10);
  v_result VARCHAR(30);
BEGIN
  INSERT INTO invoice_number_sequences (organization_id, financial_year, last_sequence)
  VALUES (p_org_id, p_fy, 0)
  ON CONFLICT (organization_id, financial_year) DO NOTHING;

  SELECT last_sequence + 1
  INTO v_seq
  FROM invoice_number_sequences
  WHERE organization_id = p_org_id
    AND financial_year  = p_fy
  FOR UPDATE;

  UPDATE invoice_number_sequences
  SET last_sequence = v_seq,
      updated_at    = NOW()
  WHERE organization_id = p_org_id
    AND financial_year  = p_fy;

  SELECT COALESCE(settings->>'invoice_prefix', 'INV')
  INTO v_prefix
  FROM organizations
  WHERE id = p_org_id;

  v_result := v_prefix || '-' || p_fy || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_invoice_number(UUID, CHAR(4)) IS
  'Thread-safe invoice number generator. Call inside BEGIN...COMMIT transaction.';

-- get_next_client_code (unchanged — correct)
CREATE OR REPLACE FUNCTION get_next_client_code(p_org_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
  v_max_code INT;
BEGIN
  SELECT COALESCE(MAX(code::INT), 0)
  INTO v_max_code
  FROM clients
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    AND code ~ '^\d+$'
  FOR UPDATE;

  RETURN LPAD((v_max_code + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- [NEW] FUNCTION: has_permission(user_id, permission)
-- Check if a user has a specific permission, considering role
-- defaults and staff_permissions overrides.
-- Returns TRUE/FALSE. Call from application layer.
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id    UUID,
  p_permission VARCHAR(80)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role        VARCHAR(20);
  v_override    BOOLEAN;
  v_expires_at  TIMESTAMPTZ;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM users WHERE id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- admin always has all permissions
  IF v_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;

  -- Check explicit override in staff_permissions
  SELECT is_granted, expires_at
  INTO v_override, v_expires_at
  FROM staff_permissions
  WHERE user_id    = p_user_id
    AND permission = p_permission
  LIMIT 1;

  IF FOUND THEN
    -- Respect expiry
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
      -- Override expired — fall through to role default
    ELSE
      RETURN v_override;
    END IF;
  END IF;

  -- Role-based defaults for staff
  IF v_role = 'staff' THEN
    RETURN p_permission IN (
      'invoice.create', 'invoice.view', 'invoice.edit',
      'client.view', 'document.upload', 'document.view',
      'document.share', 'payment.record', 'payment.view',
      'task.create', 'task.view', 'task.edit'
    );
  END IF;

  -- client role: very restricted
  IF v_role = 'client' THEN
    RETURN p_permission IN (
      'invoice.view_own', 'document.view_shared', 'payment.view_own'
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION has_permission(UUID, VARCHAR) IS
  'Returns TRUE if user has permission. Checks staff_permissions overrides first, then role defaults.';

-- [NEW] FUNCTION: revoke_expired_tokens()
-- Called by hourly cron to clean up expired client access tokens.
CREATE OR REPLACE FUNCTION revoke_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE client_access_tokens
  SET is_revoked   = TRUE,
      revoked_at   = NOW(),
      revoked_reason = 'expired'
  WHERE expires_at < NOW()
    AND is_revoked  = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION revoke_expired_tokens() IS
  'Marks expired tokens as revoked. Run hourly via cron. Returns count of tokens revoked.';

-- ============================================================
-- SECTION 9: SEED DATA
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

-- Default organization: Shah & Associates
INSERT INTO organizations (
  id, name, slug, gstin, pan, state_code,
  bank_name, bank_ifsc, bank_branch,
  subscription_plan, is_active, settings
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Shah & Associates',
  'shah-associates',
  '24AABCS9999A1Z3',
  'AABCS9999A',
  '24',
  'HDFC Bank Ltd',
  'HDFC0001234',
  'Satellite, Ahmedabad',
  'professional',
  TRUE,
  '{"invoice_prefix": "INV", "default_due_days": 30, "default_gst_rate": 18, "whatsapp_enabled": true}'
) ON CONFLICT (id) DO NOTHING;

-- Default super admin
INSERT INTO super_admins (id, name, email, password_hash, role, is_active)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Platform Admin',
  'admin@accudocs.in',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.K8Ih4FhQIXP.Hy',
  'super_admin',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Seed subscription for default org
INSERT INTO subscriptions (
  id, organization_id, plan, status, billing_cycle,
  amount, currency, current_period_start, current_period_end,
  max_clients, max_users, max_storage_gb, features,
  created_by
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'professional', 'active', 'monthly',
  2999.00, 'INR', NOW(), NOW() + INTERVAL '30 days',
  500, 20, 50,
  '{"whatsapp":true,"recurring_invoices":true,"ai_risk_score":true,"bulk_export":true}',
  'd0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Default admin user
INSERT INTO users (
  id, organization_id, name, mobile, role, is_active, password
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  '+919999999999',
  'admin',
  TRUE,
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.K8Ih4FhQIXP.Hy'
) ON CONFLICT (id) DO NOTHING;

-- System service templates
INSERT INTO service_templates
  (id, organization_id, name, description, sac_code, default_rate, is_system, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'ITR Filing — Salaried',      'ITR-1/2 for salaried individuals',     '998231', 2500.00,  TRUE, 1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'ITR Filing — Business',      'ITR-3/4 with P&L and Balance Sheet',   '998231', 5000.00,  TRUE, 2),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'GST Return — Monthly',       'GSTR-1 and GSTR-3B monthly filing',    '998232', 2000.00,  TRUE, 3),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'GST Return — Quarterly',     'Quarterly GST return QRMP scheme',     '998232', 3500.00,  TRUE, 4),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Tax Audit Report (3CD)',      'Audit report under Section 44AB',      '998222', 15000.00, TRUE, 5),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Statutory Audit',             'Annual statutory audit for companies', '998211', 25000.00, TRUE, 6),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Company Registration',        'Incorporation of Pvt Ltd Company',     '998399', 8000.00,  TRUE, 7),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'TDS Return (24Q/26Q)',        'Quarterly TDS return filing',          '998232', 1500.00,  TRUE, 8),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'GST Registration',            'New GST registration',                 '998232', 3000.00,  TRUE, 9),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'MCA Annual Filing',           'Annual ROC filing AOC-4/MGT-7',        '998399', 5000.00,  TRUE, 10),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'LUT Filing',                  'Letter of Undertaking for exporters',  '998232', 1000.00,  TRUE, 11),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
   'Balance Sheet Preparation',   'Annual accounts finalization',         '998211', 8000.00,  TRUE, 12)
ON CONFLICT (id) DO NOTHING;

-- Bootstrap invoice number sequence for current FY
INSERT INTO invoice_number_sequences (organization_id, financial_year, last_sequence)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  calculate_financial_year(CURRENT_DATE),
  0
) ON CONFLICT (organization_id, financial_year) DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- AccuDocs v2.0.0 | PostgreSQL 15+
--
-- Tables  : 23 (was 17, +6 new)
-- Views   : 7  (was 5,  +2 new)
-- Functions: 6  (was 3,  +3 new)
-- Triggers : 8  (was 5,  +3 new)
-- Indexes  : 90+ (was 76, +14 new)
-- RLS Policies: 22 (new in v2)
-- ============================================================
