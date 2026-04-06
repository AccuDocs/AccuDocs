-- Migration: Add Checklist and Compliance Tables
-- Date: 2026-04-06

-- ------------------------------------------------------------
-- [NEW] TABLE: checklist_templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100)  NOT NULL,
  service_type VARCHAR(20)   NOT NULL
                 CHECK (service_type IN ('itr','gst','audit','roc','tds','custom')),
  description  TEXT          NULL,
  items        JSONB         NOT NULL DEFAULT '[]',
  is_default   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by   UUID          NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_checklist_templates
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- [NEW] TABLE: checklists
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id    UUID          NULL     REFERENCES checklist_templates(id) ON DELETE SET NULL,
  name           VARCHAR(200)  NOT NULL,
  financial_year VARCHAR(20)   NOT NULL,
  service_type   VARCHAR(50)   NOT NULL,
  items          JSONB         NOT NULL DEFAULT '[]',
  progress       NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
  total_items    INTEGER       NOT NULL DEFAULT 0,
  received_items INTEGER       NOT NULL DEFAULT 0,
  status         VARCHAR(20)   NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','archived')),
  due_date       DATE          NULL,
  completed_at   TIMESTAMPTZ   NULL,
  notes          TEXT          NULL,
  created_by     UUID          NOT NULL REFERENCES users(id),
  deleted_at     TIMESTAMPTZ   NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_checklists
  BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- [NEW] TABLE: compliance_deadlines
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_deadlines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              VARCHAR(20)   NOT NULL
                      CHECK (type IN ('ITR','GST','TDS','ROC','ADVANCE_TAX','OTHER')),
  title             VARCHAR(255)  NOT NULL,
  due_date          DATE          NOT NULL,
  recurring         BOOLEAN       NOT NULL DEFAULT FALSE,
  recurring_pattern VARCHAR(50)   NULL,
  description       TEXT          NULL,
  is_seeded         BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_updated_at_compliance_deadlines
  BEFORE UPDATE ON compliance_deadlines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- [NEW] TABLE: client_deadlines
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_deadlines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deadline_id UUID          NOT NULL REFERENCES compliance_deadlines(id) ON DELETE CASCADE,
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','filed','overdue')),
  filed_date  DATE          NULL,
  notes       TEXT          NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_deadline UNIQUE (client_id, deadline_id)
);

CREATE OR REPLACE TRIGGER set_updated_at_client_deadlines
  BEFORE UPDATE ON client_deadlines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
