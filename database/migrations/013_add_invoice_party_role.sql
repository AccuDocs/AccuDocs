-- Distinguish customer-facing invoices from vendor bills.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS party_role VARCHAR(20) NOT NULL DEFAULT 'customer';

COMMENT ON COLUMN invoices.party_role IS 'Billing party role: customer or vendor.';

CREATE INDEX IF NOT EXISTS idx_invoices_party_role
  ON invoices(party_role);
