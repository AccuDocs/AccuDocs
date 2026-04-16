-- Migration 006: ITC Ledger and GSTR-2A Reconciliation tables
-- Run: psql -d accudocs -f database/migrations/006_itc_and_gstr2a.sql

-- ITC Ledger
CREATE TABLE IF NOT EXISTS itc_ledger (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id         UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period            VARCHAR(7)    NOT NULL,  -- Format: YYYY-MM
  igst_claimed      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_claimed      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_claimed      NUMERIC(12,2) NOT NULL DEFAULT 0,
  eligible_itc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ineligible_itc    NUMERIC(12,2) NOT NULL DEFAULT 0,
  reversed_itc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  source            VARCHAR(10)   NOT NULL DEFAULT 'manual' CHECK (source IN ('GSTR2A', 'manual')),
  status            VARCHAR(20)   NOT NULL DEFAULT 'calculated',
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'itc_ledger' AND indexname = 'itc_ledger_client_period_idx'
  ) THEN
    CREATE UNIQUE INDEX itc_ledger_client_period_idx
      ON itc_ledger(client_id, period);
  END IF;
END $$;

COMMENT ON TABLE itc_ledger IS 'Input Tax Credit tracker per client per GST period (YYYY-MM)';

-- GSTR-2A Reconciliation snapshots
CREATE TABLE IF NOT EXISTS gstr2a_reconciliations (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id         UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period            VARCHAR(7)    NOT NULL,
  matched           JSONB         NOT NULL DEFAULT '[]',
  mismatched        JSONB         NOT NULL DEFAULT '[]',
  missing_in_books  JSONB         NOT NULL DEFAULT '[]',
  missing_in_2a     JSONB         NOT NULL DEFAULT '[]',
  total_matched     INTEGER       NOT NULL DEFAULT 0,
  total_mismatched  INTEGER       NOT NULL DEFAULT 0,
  total_missing_books INTEGER     NOT NULL DEFAULT 0,
  total_missing_2a  INTEGER       NOT NULL DEFAULT 0,
  reconciled_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by        UUID          REFERENCES users(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'gstr2a_reconciliations' AND indexname = 'gstr2a_recon_client_period_idx'
  ) THEN
    CREATE INDEX gstr2a_recon_client_period_idx
      ON gstr2a_reconciliations(client_id, period);
  END IF;
END $$;

COMMENT ON TABLE gstr2a_reconciliations IS 'GSTR-2A reconciliation snapshots per client per period';
