-- Migration 017: GST phase 2 e-invoice / e-way bill tables
-- Run from repo root:
--   psql -d accudocs -f database/migrations/017_gst_phase2_einvoice_eway.sql

CREATE TABLE IF NOT EXISTS e_invoices (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  irn               VARCHAR(64),
  ack_no            VARCHAR(30),
  ack_date          TIMESTAMPTZ,
  signed_invoice    JSONB,
  signed_qr_code    TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'generated'
                    CHECK (status IN ('generated', 'cancelled', 'failed')),
  error_message     TEXT,
  raw_response      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS e_invoices_irn_unique
  ON e_invoices(irn)
  WHERE irn IS NOT NULL;

CREATE INDEX IF NOT EXISTS e_invoices_invoice_id_idx
  ON e_invoices(invoice_id);

CREATE INDEX IF NOT EXISTS e_invoices_org_status_idx
  ON e_invoices(organization_id, status);

CREATE TABLE IF NOT EXISTS eway_bills (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  eway_bill_no      VARCHAR(20),
  generated_at      TIMESTAMPTZ,
  valid_upto        TIMESTAMPTZ,
  transporter_id    VARCHAR(20),
  vehicle_no        VARCHAR(20),
  distance_km       INTEGER     NOT NULL DEFAULT 0,
  transport_mode    VARCHAR(10) NOT NULL DEFAULT 'road'
                    CHECK (transport_mode IN ('road', 'rail', 'air', 'ship')),
  status            VARCHAR(20) NOT NULL DEFAULT 'generated'
                    CHECK (status IN ('generated', 'cancelled', 'expired')),
  raw_response      JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eway_bills_invoice_id_idx
  ON eway_bills(invoice_id);

CREATE INDEX IF NOT EXISTS eway_bills_no_idx
  ON eway_bills(eway_bill_no);

CREATE INDEX IF NOT EXISTS eway_bills_org_status_idx
  ON eway_bills(organization_id, status);

COMMENT ON TABLE e_invoices IS 'E-invoice IRN records generated or looked up for billing invoices.';
COMMENT ON TABLE eway_bills IS 'E-way bill records generated for billing invoices.';
