-- Scope vendor master records to a client workspace when applicable.
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vendors_org_client
  ON vendors(organization_id, client_id);
