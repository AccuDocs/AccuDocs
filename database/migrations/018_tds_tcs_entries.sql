-- Migration 018: TDS/TCS compliance entry tables
-- Run from repo root:
--   psql -d accudocs -f database/migrations/018_tds_tcs_entries.sql

CREATE TABLE IF NOT EXISTS tds_entries (
  id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deductor        VARCHAR(200)  NOT NULL,
  pan             VARCHAR(10)   NOT NULL,
  section         VARCHAR(10)   NOT NULL,
  payment_nature  VARCHAR(200)  NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  tds_rate        NUMERIC(5,2)  NOT NULL,
  tds_amount      NUMERIC(14,2) NOT NULL,
  period          VARCHAR(10)   NOT NULL,
  challan_no      VARCHAR(20),
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'deducted', 'deposited', 'filed')),
  deduction_date  DATE,
  deposit_date    DATE,
  remarks         TEXT,
  created_by      UUID          NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tds_entries_org_client_idx
  ON tds_entries(organization_id, client_id);

CREATE INDEX IF NOT EXISTS tds_entries_period_idx
  ON tds_entries(period);

CREATE INDEX IF NOT EXISTS tds_entries_section_idx
  ON tds_entries(section);

CREATE TABLE IF NOT EXISTS tcs_entries (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seller_gstin      VARCHAR(15)   NOT NULL,
  buyer_gstin       VARCHAR(15)   NOT NULL,
  transaction_value NUMERIC(14,2) NOT NULL,
  tcs_rate          NUMERIC(5,2)  NOT NULL,
  tcs_amount        NUMERIC(14,2) NOT NULL,
  period            VARCHAR(10)   NOT NULL,
  collection_date   DATE,
  remarks           TEXT,
  created_by        UUID          NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tcs_entries_org_idx
  ON tcs_entries(organization_id);

CREATE INDEX IF NOT EXISTS tcs_entries_period_idx
  ON tcs_entries(period);

CREATE INDEX IF NOT EXISTS tcs_entries_gstin_pair_idx
  ON tcs_entries(seller_gstin, buyer_gstin);

COMMENT ON TABLE tds_entries IS 'Tax deducted at source entries used by compliance TDS/TCS workflows.';
COMMENT ON TABLE tcs_entries IS 'Tax collected at source entries used by compliance TDS/TCS workflows.';
