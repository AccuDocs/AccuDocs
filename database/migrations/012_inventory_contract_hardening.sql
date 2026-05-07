-- ============================================================
-- Migration 012: Inventory Contract Hardening
-- Adds client-scoped transfers, transaction-safe inventory
-- numbering, organization-scoped SKU uniqueness, and invoice
-- line inventory linkage.
-- ============================================================

ALTER TABLE stock_transfers
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_transfers_client_id
  ON stock_transfers(client_id);

CREATE TABLE IF NOT EXISTS inventory_number_sequences (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_type VARCHAR(30) NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, sequence_type)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'items'
      AND constraint_name = 'items_sku_key'
      AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE items DROP CONSTRAINT items_sku_key;
  END IF;
END $$;

DROP INDEX IF EXISTS items_sku_key;
DROP INDEX IF EXISTS idx_items_sku_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_org_sku_unique
  ON items(org_id, sku)
  WHERE sku IS NOT NULL;

ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES item_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item_id
  ON invoice_line_items(item_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_warehouse_id
  ON invoice_line_items(warehouse_id);
