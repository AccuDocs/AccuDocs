-- ============================================================
-- AccuDocs — Complete PostgreSQL Database Schema
-- Version: 1.0.0 | PostgreSQL 15+
-- Architecture: Monolithic, multi-tenant, soft-delete everywhere
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
-- TABLE: organizations
-- Root multi-tenant entity. One row = one CA firm.
-- SCALE NOTE: All queries must include organization_id in WHERE.
-- All indexes are org-scoped. Never query without org filter.
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(150)  NOT NULL,
  slug                 VARCHAR(100)  NOT NULL UNIQUE,
  gstin                VARCHAR(15)   NULL,
  pan                  VARCHAR(10)   NULL,
  address              TEXT          NULL,
  state_code           CHAR(2)       NOT NULL DEFAULT '24',
  phone                VARCHAR(20)   NULL,
  email                VARCHAR(150)  NULL,
  logo_s3_key          VARCHAR(500)  NULL,
  bank_name            VARCHAR(150)  NULL,
  bank_account_number  VARCHAR(30)   NULL,
  bank_ifsc            VARCHAR(15)   NULL,
  bank_branch          VARCHAR(150)  NULL,
  udin                 VARCHAR(30)   NULL,
  subscription_plan    VARCHAR(20)   NOT NULL DEFAULT 'starter'
                         CHECK (subscription_plan IN ('starter','professional','enterprise')),
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  settings             JSONB         NOT NULL DEFAULT '{}',
  deleted_at           TIMESTAMPTZ   NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Root multi-tenant entity. One row per CA firm.';
COMMENT ON COLUMN organizations.settings IS 'Firm config: invoice_prefix, default_due_days, gst_rate, etc.';
COMMENT ON COLUMN organizations.udin IS 'Unique Document Identification Number for CAs (ICAI requirement)';

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: users
-- All humans: admins, staff, and clients.
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
  preferences       JSONB         NOT NULL DEFAULT '{}',
  deleted_at        TIMESTAMPTZ   NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_org_mobile UNIQUE (organization_id, mobile)
);

COMMENT ON TABLE users IS 'All authenticated users: admins, staff, and clients.';
COMMENT ON COLUMN users.password IS 'Nullable — WhatsApp OTP is primary auth method.';
COMMENT ON COLUMN users.preferences IS 'UI preferences: theme, language, notification settings.';

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
-- TABLE: clients
-- A client of the CA firm. Root entity for billing and docs.
-- SCALE NOTE: metadata JSONB has GIN index for flexible queries.
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
  credit_limit     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
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
COMMENT ON COLUMN clients.state_code IS '2-digit GST state code. 24=Gujarat, 27=Maharashtra.';

CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: years
-- Financial years per client. Organizes document workspace.
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
-- Document folder hierarchy. Auto-created on client onboarding.
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
-- Every file in the system. Metadata only — files live on S3.
-- SCALE NOTE: s3_key is source of truth. Never store binary in DB.
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
COMMENT ON COLUMN documents.version IS 'Version number. parent_document_id links versions together.';

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
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
-- CRITICAL: Always use SELECT FOR UPDATE when reading this table.
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
COMMENT ON COLUMN invoice_number_sequences.financial_year IS
  'e.g. 2526 = FY April 2025 - March 2026';

-- ------------------------------------------------------------
-- TABLE: recurring_invoice_templates
-- Schedule-based auto invoice generation. Read by daily cron.
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
COMMENT ON COLUMN recurring_invoice_templates.line_items_snapshot IS
  'JSONB snapshot: [{description, sac_code, quantity, unit_rate}]. Frozen at creation so price changes do not affect future invoices.';
COMMENT ON COLUMN recurring_invoice_templates.auto_issue IS
  'TRUE = skip draft status, go straight to issued and send WhatsApp.';

CREATE TRIGGER set_updated_at_recurring_invoice_templates
  BEFORE UPDATE ON recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: invoices
-- Master invoice record. Central billing entity.
-- SCALE NOTE: Partition candidate by invoice_date when > 10M rows.
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
COMMENT ON COLUMN invoices.balance_due IS 'Generated column: total_amount - amount_paid. Never update directly.';
COMMENT ON COLUMN invoices.client_gstin IS 'Snapshot of GSTIN at invoice creation. Preserved even if client GSTIN changes later.';
COMMENT ON COLUMN invoices.round_off IS 'Signed: ROUND(subtotal+tax) - (subtotal+tax). Can be negative.';

CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: invoice_line_items
-- One row per service per invoice. Cascades on invoice delete.
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

COMMENT ON TABLE invoice_line_items IS 'One row per service on an invoice. amount = qty × rate (generated).';
COMMENT ON COLUMN invoice_line_items.amount IS 'Generated column: quantity * unit_rate. Never update directly.';

CREATE TRIGGER set_updated_at_invoice_line_items
  BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: payments
-- Payment records against invoices. Supports partial payments.
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

COMMENT ON TABLE payments IS 'Payment records. Each row updates invoice.amount_paid via trigger.';
COMMENT ON COLUMN payments.reference_number IS 'UTR number, cheque number, UPI transaction ID, etc.';

CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: revenue_forecasts
-- Persisted intelligenceService output. Recalculated weekly.
-- SCALE NOTE: Insert-only. Never UPDATE rows, always INSERT new.
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
  'Immutable forecast snapshots. Insert-only — never update rows. Dashboard reads latest by forecast_date.';

-- ------------------------------------------------------------
-- TABLE: client_risk_scores
-- Historical risk snapshots per client. Insert-only pattern.
-- SCALE NOTE: Always query with DISTINCT ON (client_id) ORDER BY calculated_at DESC.
-- ------------------------------------------------------------
CREATE TABLE client_risk_scores (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID          NOT NULL REFERENCES organizations(id),
  client_id                UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  score                    SMALLINT      NOT NULL CHECK (score BETWEEN 0 AND 100),
  ltv_segment              VARCHAR(10)   NOT NULL DEFAULT 'LOW'
                             CHECK (ltv_segment IN ('LOW','MEDIUM','HIGH')),
  payment_history_score    SMALLINT      NOT NULL DEFAULT 0,
  overdue_frequency_score  SMALLINT      NOT NULL DEFAULT 0,
  consistency_score        SMALLINT      NOT NULL DEFAULT 0,
  credit_utilization_score SMALLINT      NOT NULL DEFAULT 0,
  avg_days_to_pay          NUMERIC(5,1)  NULL,
  overdue_rate_pct         NUMERIC(5,2)  NULL,
  current_outstanding      NUMERIC(12,2) NULL,
  credit_limit_used        NUMERIC(12,2) NULL,
  two_year_revenue         NUMERIC(14,2) NULL,
  projected_three_year_revenue NUMERIC(14,2) NULL,
  calculated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE client_risk_scores IS
  'Immutable risk score snapshots. Insert-only. Score 0=risky, 100=reliable. HIGH ltv = >= 70.';

-- ------------------------------------------------------------
-- TABLE: tasks
-- Work tracker for CA firm staff.
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           UUID          NULL     REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to         UUID          NULL     REFERENCES users(id) ON DELETE SET NULL,
  created_by          UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title               VARCHAR(255)  NOT NULL,
  description         TEXT          NULL,
  priority            VARCHAR(10)   NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('high','medium','low')),
  status              VARCHAR(20)   NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo','in_progress','review','done')),
  due_date            TIMESTAMPTZ   NULL,
  tags                JSONB         NOT NULL DEFAULT '[]',
  completed_at        TIMESTAMPTZ   NULL,
  related_invoice_id  UUID          NULL REFERENCES invoices(id) ON DELETE SET NULL,
  related_document_id UUID          NULL REFERENCES documents(id) ON DELETE SET NULL,
  deleted_at          TIMESTAMPTZ   NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Work tracker for CA staff. completed_at auto-set by trigger on status=done.';

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- TABLE: notifications
-- In-app and WhatsApp notification log.
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NOT NULL REFERENCES organizations(id),
  user_id          UUID          NULL     REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50)   NOT NULL
                     CHECK (type IN (
                       'invoice_issued','invoice_overdue','payment_received',
                       'document_shared','task_assigned','task_due',
                       'credit_limit_warning','risk_score_alert','system'
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

COMMENT ON TABLE notifications IS 'Notification log for in-app and WhatsApp delivery. No soft delete.';
COMMENT ON COLUMN notifications.metadata IS 'Deep-link context: {invoice_id, client_id, document_id}.';

-- ------------------------------------------------------------
-- TABLE: audit_logs
-- Immutable append-only audit trail for all mutating events.
-- SCALE NOTE: Archive rows older than 1 year. Never hard-delete.
-- Never add FK constraints FROM other tables TO audit_logs.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID          NULL REFERENCES organizations(id) ON DELETE SET NULL,
  user_id          UUID          NULL REFERENCES users(id) ON DELETE SET NULL,
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
  'Immutable audit trail. Append-only — never UPDATE or DELETE rows. Archive after 1 year.';
COMMENT ON COLUMN audit_logs.action IS 'e.g. invoice.issued, client.created, document.deleted';
COMMENT ON COLUMN audit_logs.entity_type IS 'e.g. invoice, client, document, task';

-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- organizations
CREATE INDEX idx_orgs_slug        ON organizations(slug)      WHERE deleted_at IS NULL;
CREATE INDEX idx_orgs_is_active   ON organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_orgs_pan         ON organizations(pan)        WHERE pan IS NOT NULL;

-- users
CREATE INDEX idx_users_org_id     ON users(organization_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_users_mobile     ON users(mobile)             WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role       ON users(role)               WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active  ON users(is_active)          WHERE deleted_at IS NULL;

-- otps
CREATE INDEX idx_otps_mobile      ON otps(mobile);
CREATE INDEX idx_otps_expires_at  ON otps(expires_at);

-- clients
CREATE INDEX idx_clients_org_id   ON clients(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_user_id  ON clients(user_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_is_active ON clients(is_active)      WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_gstin    ON clients(gstin)           WHERE gstin IS NOT NULL;
CREATE INDEX idx_clients_org_active ON clients(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_metadata ON clients USING GIN(metadata);
CREATE INDEX idx_clients_name_trgm ON clients USING GIN(name gin_trgm_ops);
CREATE INDEX idx_clients_mobile_trgm ON clients USING GIN(mobile gin_trgm_ops) WHERE mobile IS NOT NULL;

-- years
CREATE INDEX idx_years_client_id  ON years(client_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_years_org_id     ON years(organization_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_years_year       ON years(year)              WHERE deleted_at IS NULL;

-- folders
CREATE INDEX idx_folders_client_id     ON folders(client_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_year_id       ON folders(year_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_parent        ON folders(parent_folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_org_id        ON folders(organization_id)  WHERE deleted_at IS NULL;

-- documents
CREATE INDEX idx_docs_client_year ON documents(client_id, year_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_folder_id   ON documents(folder_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_org_uploader ON documents(organization_id, uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_s3_key      ON documents(s3_key);
CREATE INDEX idx_docs_parent      ON documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX idx_docs_shared      ON documents(is_shared_with_client) WHERE deleted_at IS NULL AND is_shared_with_client = TRUE;
CREATE INDEX idx_docs_tags        ON documents USING GIN(tags);

-- service_templates
CREATE INDEX idx_svc_tmpl_org_id  ON service_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_svc_tmpl_active  ON service_templates(is_active)        WHERE deleted_at IS NULL;
CREATE INDEX idx_svc_tmpl_sac     ON service_templates(sac_code);

-- recurring_invoice_templates
CREATE INDEX idx_rec_client_id    ON recurring_invoice_templates(client_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_rec_org_id       ON recurring_invoice_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rec_active_due   ON recurring_invoice_templates(next_run_date)
  WHERE is_active = TRUE AND deleted_at IS NULL;

-- invoices
CREATE INDEX idx_inv_org_client   ON invoices(organization_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_status       ON invoices(status)                     WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_invoice_date ON invoices(invoice_date)               WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_due_date     ON invoices(due_date)                   WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_client_status ON invoices(client_id, status)         WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_recurring    ON invoices(recurring_template_id)      WHERE recurring_template_id IS NOT NULL;
CREATE INDEX idx_inv_overdue      ON invoices(due_date, status)
  WHERE status IN ('issued','partially_paid') AND deleted_at IS NULL;

-- invoice_line_items
CREATE INDEX idx_line_invoice_id  ON invoice_line_items(invoice_id);
CREATE INDEX idx_line_template_id ON invoice_line_items(service_template_id) WHERE service_template_id IS NOT NULL;

-- payments
CREATE INDEX idx_pay_invoice_id   ON payments(invoice_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_client_id    ON payments(client_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_org_id       ON payments(organization_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_date         ON payments(payment_date)     WHERE deleted_at IS NULL;

-- revenue_forecasts
CREATE INDEX idx_rf_org_date      ON revenue_forecasts(organization_id, forecast_date DESC);

-- client_risk_scores
CREATE INDEX idx_crs_client_date  ON client_risk_scores(client_id, calculated_at DESC);
CREATE INDEX idx_crs_org_id       ON client_risk_scores(organization_id);
CREATE INDEX idx_crs_score        ON client_risk_scores(score);
CREATE INDEX idx_crs_ltv          ON client_risk_scores(ltv_segment);

-- tasks
CREATE INDEX idx_tasks_org_assigned ON tasks(organization_id, assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_org_client   ON tasks(organization_id, client_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status       ON tasks(status)                       WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority     ON tasks(priority)                     WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date     ON tasks(due_date)                     WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_client_status ON tasks(client_id, status)           WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status)       WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority_due  ON tasks(priority, due_date)
  WHERE deleted_at IS NULL AND status != 'done';
CREATE INDEX idx_tasks_tags         ON tasks USING GIN(tags);

-- notifications
CREATE INDEX idx_notif_user_read    ON notifications(user_id, is_read);
CREATE INDEX idx_notif_org_type     ON notifications(organization_id, type);
CREATE INDEX idx_notif_sent_at      ON notifications(sent_at);

-- audit_logs
CREATE INDEX idx_audit_org_entity   ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_user_id      ON audit_logs(user_id);
CREATE INDEX idx_audit_action       ON audit_logs(action);
CREATE INDEX idx_audit_created_at   ON audit_logs(created_at);
CREATE INDEX idx_audit_entity_id    ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;

-- ============================================================
-- SECTION 5: TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- TRIGGER: tasks_completed_at
-- Auto-set/clear completed_at when task status changes.
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
-- After INSERT/UPDATE on payments, recalculate invoice amounts
-- and update status to partially_paid or paid.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id     UUID;
  v_total_amount   NUMERIC(12,2);
  v_total_paid     NUMERIC(12,2);
  v_new_status     VARCHAR(20);
BEGIN
  -- Determine which invoice was affected
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Sum all non-deleted payments for this invoice
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

  -- Determine new status
  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    -- Revert to issued or overdue based on due_date
    SELECT CASE
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'issued'
    END INTO v_new_status
    FROM invoices WHERE id = v_invoice_id;
  END IF;

  -- Update invoice
  UPDATE invoices SET
    amount_paid = v_total_paid,
    status      = v_new_status,
    paid_at     = CASE WHEN v_new_status = 'paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END,
    updated_at  = NOW()
  WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_invoice_payment_status();

-- ------------------------------------------------------------
-- TRIGGER: audit_log_invoices
-- Write to audit_logs after every INSERT/UPDATE on invoices.
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
    -- Only log meaningful status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (
        organization_id, entity_type, entity_id,
        action, description, old_values, new_values
      ) VALUES (
        NEW.organization_id, 'invoice', NEW.id,
        'invoice.' || NEW.status,
        'Invoice ' || NEW.invoice_number || ' status changed from ' || OLD.status || to ' || NEW.status,
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

-- ============================================================
-- SECTION 6: VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW: v_client_summary
-- One row per client with billing and risk aggregates.
-- ------------------------------------------------------------
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
  COALESCE(SUM(inv.total_amount) FILTER (WHERE inv.status = 'paid'), 0) AS total_billed_paid,
  COALESCE(SUM(inv.balance_due)  FILTER (WHERE inv.status IN ('issued','partially_paid','overdue')), 0) AS total_outstanding,
  crs.score                                                         AS latest_risk_score,
  crs.ltv_segment,
  crs.calculated_at                                                 AS risk_calculated_at,
  c.created_at
FROM clients c
JOIN users u ON c.user_id = u.id
LEFT JOIN years y       ON y.client_id = c.id        AND y.deleted_at IS NULL
LEFT JOIN documents d   ON d.client_id = c.id        AND d.deleted_at IS NULL
LEFT JOIN invoices inv  ON inv.client_id = c.id      AND inv.deleted_at IS NULL
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

-- ------------------------------------------------------------
-- VIEW: v_billing_metrics
-- Aggregate billing stats per organization for dashboard.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_billing_metrics AS
SELECT
  organization_id,
  COUNT(*)                                                                        AS total_invoices,
  COUNT(*) FILTER (WHERE status = 'draft')                                        AS draft_count,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'draft'), 0)                 AS draft_value,
  COUNT(*) FILTER (WHERE status = 'issued')                                       AS issued_count,
  COUNT(*) FILTER (WHERE status = 'partially_paid')                               AS partially_paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue')                                      AS overdue_count,
  COUNT(*) FILTER (WHERE status = 'paid')                                         AS paid_count,
  COALESCE(SUM(balance_due) FILTER (WHERE status IN ('issued','partially_paid','overdue')), 0) AS total_outstanding,
  COALESCE(SUM(balance_due) FILTER (WHERE status = 'overdue'), 0)                AS total_overdue,
  COALESCE(SUM(total_amount) FILTER (
    WHERE status = 'paid'
      AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())
  ), 0)                                                                           AS collected_this_month,
  COALESCE(SUM(total_amount) FILTER (
    WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', NOW())
  ), 0)                                                                           AS billed_this_month
FROM invoices
WHERE deleted_at IS NULL
GROUP BY organization_id;

-- ------------------------------------------------------------
-- VIEW: v_overdue_invoices
-- For the WhatsApp reminder cron. Ordered by days overdue.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- VIEW: v_recurring_due_today
-- For the daily recurring billing cron job.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_recurring_due_today AS
SELECT
  rt.id                         AS template_id,
  rt.organization_id,
  rt.client_id,
  rt.name                       AS template_name,
  rt.frequency,
  rt.next_run_date,
  rt.advance_notice_days,
  rt.auto_issue,
  rt.line_items_snapshot,
  rt.default_notes,
  rt.default_due_days,
  c.name                        AS client_name,
  u.mobile                      AS client_mobile,
  c.gstin                       AS client_gstin,
  c.state_code                  AS client_state_code
FROM recurring_invoice_templates rt
JOIN clients c ON rt.client_id = c.id
JOIN users u   ON c.user_id = u.id
WHERE rt.next_run_date <= CURRENT_DATE
  AND rt.is_active = TRUE
  AND rt.deleted_at IS NULL
  AND c.deleted_at IS NULL;

-- ------------------------------------------------------------
-- VIEW: v_dashboard_summary
-- One-row-per-org summary for the main dashboard widget.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  o.id                                                              AS organization_id,
  o.name                                                            AS organization_name,
  COUNT(DISTINCT c.id)                                              AS total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = TRUE)           AS active_clients,
  COUNT(DISTINCT d.id)                                              AS total_documents,
  COUNT(DISTINCT inv.id)                                            AS total_invoices,
  COALESCE(SUM(inv.balance_due) FILTER (WHERE inv.status IN ('issued','partially_paid','overdue')), 0) AS outstanding_amount,
  COALESCE(SUM(inv.balance_due) FILTER (WHERE inv.status = 'overdue'), 0) AS overdue_amount,
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

-- ============================================================
-- SECTION 7: FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: calculate_financial_year(DATE)
-- Returns CHAR(4) FY code. April start = Indian FY.
-- Example: 2025-06-15 → '2526', 2026-01-10 → '2526'
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_financial_year(check_date DATE)
RETURNS CHAR(4) AS $$
DECLARE
  y      INT;
  m      INT;
  fy     CHAR(4);
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

-- ------------------------------------------------------------
-- FUNCTION: get_next_invoice_number(UUID, CHAR(4))
-- Thread-safe invoice number generation using FOR UPDATE lock.
-- MUST be called inside a transaction by the application.
-- Returns formatted string e.g. INV-2526-001
-- ------------------------------------------------------------
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
  -- Upsert sequence row and lock it
  INSERT INTO invoice_number_sequences (organization_id, financial_year, last_sequence)
  VALUES (p_org_id, p_fy, 0)
  ON CONFLICT (organization_id, financial_year) DO NOTHING;

  SELECT last_sequence + 1
  INTO v_seq
  FROM invoice_number_sequences
  WHERE organization_id = p_org_id
    AND financial_year = p_fy
  FOR UPDATE;

  UPDATE invoice_number_sequences
  SET last_sequence = v_seq,
      updated_at    = NOW()
  WHERE organization_id = p_org_id
    AND financial_year  = p_fy;

  -- Get invoice prefix from org settings (default 'INV')
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

-- ------------------------------------------------------------
-- FUNCTION: get_next_client_code(UUID)
-- Thread-safe client code generator per organization.
-- Returns zero-padded 3-digit string: 001, 002, ...
-- ------------------------------------------------------------
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

COMMENT ON FUNCTION get_next_client_code(UUID) IS
  'Returns next sequential client code per org: 001, 002, 003...';

-- ============================================================
-- SECTION 8: SEED DATA
-- Uses hardcoded UUIDs + ON CONFLICT DO NOTHING for idempotency.
-- Safe to run multiple times.
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
  '{"invoice_prefix": "INV", "default_due_days": 30, "default_gst_rate": 18}'
) ON CONFLICT (id) DO NOTHING;

-- Default admin user
INSERT INTO users (
  id, organization_id, name, mobile, role, is_active,
  password
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  '+919999999999',
  'admin',
  TRUE,
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.K8Ih4FhQIXP.Hy'
) ON CONFLICT (id) DO NOTHING;

-- System service templates (organization_id = default org)
INSERT INTO service_templates
  (id, organization_id, name, description, sac_code, default_rate, is_system, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'ITR Filing — Salaried',       'ITR-1/2 for salaried individuals',           '998231', 2500.00,  TRUE, 1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'ITR Filing — Business',       'ITR-3/4 with P&L and Balance Sheet',          '998231', 5000.00,  TRUE, 2),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'GST Return — Monthly',        'GSTR-1 and GSTR-3B monthly filing',           '998232', 2000.00,  TRUE, 3),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'GST Return — Quarterly',      'Quarterly GST return QRMP scheme',            '998232', 3500.00,  TRUE, 4),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Tax Audit Report (3CD)',       'Audit report under Section 44AB',             '998222', 15000.00, TRUE, 5),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Statutory Audit',              'Annual statutory audit for companies',        '998211', 25000.00, TRUE, 6),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Company Registration',         'Incorporation of Private Limited Company',    '998399', 8000.00,  TRUE, 7),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'TDS Return (24Q/26Q)',         'Quarterly TDS return filing',                 '998232', 1500.00,  TRUE, 8),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'GST Registration',             'New GST registration',                        '998232', 3000.00,  TRUE, 9),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'MCA Annual Filing',            'Annual ROC filing AOC-4/MGT-7',               '998399', 5000.00,  TRUE, 10),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'LUT Filing',                   'Letter of Undertaking for exporters',         '998232', 1000.00,  TRUE, 11),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
   'Balance Sheet Preparation',    'Annual accounts finalization',                '998211', 8000.00,  TRUE, 12)
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
-- AccuDocs v1.0.0 | PostgreSQL 15+
-- Tables: 17 | Views: 5 | Functions: 3 | Triggers: 5
-- ============================================================
