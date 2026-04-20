-- ============================================================
-- Migration 010: Inventory Module Schema
-- AccuDocs — GST Accounting & Document Management Platform
-- ============================================================

-- 1. warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id        UUID,
  name             VARCHAR(150) NOT NULL,
  code             VARCHAR(20)  NOT NULL,
  address          TEXT,
  gstin            VARCHAR(15),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

-- 2. item_categories
CREATE TABLE IF NOT EXISTS item_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  parent_id   UUID REFERENCES item_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, name, parent_id)
);

-- 3. items
CREATE TABLE IF NOT EXISTS items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  VARCHAR(200) NOT NULL,
  sku                   VARCHAR(100) UNIQUE,
  barcode               VARCHAR(100),
  hsn_sac_code          VARCHAR(20),
  item_type             VARCHAR(10) NOT NULL DEFAULT 'goods' CHECK (item_type IN ('goods','service')),
  unit_of_measure       VARCHAR(30) NOT NULL DEFAULT 'PCS',
  purchase_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp                   NUMERIC(12,2),
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 18,
  cess_rate             NUMERIC(5,2) NOT NULL DEFAULT 0,
  track_inventory       BOOLEAN NOT NULL DEFAULT TRUE,
  allow_negative_stock  BOOLEAN NOT NULL DEFAULT FALSE,
  reorder_point         INTEGER,
  reorder_qty           INTEGER,
  category_id           UUID REFERENCES item_categories(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_org_id       ON items(org_id);
CREATE INDEX IF NOT EXISTS idx_items_sku          ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode      ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_category_id  ON items(category_id);

-- 4. item_variants
CREATE TABLE IF NOT EXISTS item_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_name     VARCHAR(100) NOT NULL,
  sku_suffix       VARCHAR(50),
  barcode          VARCHAR(100),
  additional_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  attributes       JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_item_variants_item_id ON item_variants(item_id);

-- 5. client_item_pricing  (client-specific price overrides)
CREATE TABLE IF NOT EXISTS client_item_pricing (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES items(id)         ON DELETE CASCADE,
  variant_id          UUID         REFERENCES item_variants(id)  ON DELETE SET NULL,
  custom_selling_price NUMERIC(12,2) NOT NULL,
  discount_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,
  valid_from          DATE,
  valid_to            DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, item_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_client_item_pricing_client_id ON client_item_pricing(client_id);
CREATE INDEX IF NOT EXISTS idx_client_item_pricing_item_id   ON client_item_pricing(item_id);

-- 6. stock_ledger (append-only — NEVER UPDATE or DELETE rows)
CREATE TABLE IF NOT EXISTS stock_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  warehouse_id       UUID NOT NULL REFERENCES warehouses(id)     ON DELETE RESTRICT,
  item_id            UUID NOT NULL REFERENCES items(id)          ON DELETE RESTRICT,
  variant_id         UUID         REFERENCES item_variants(id)   ON DELETE SET NULL,
  transaction_type   VARCHAR(30) NOT NULL CHECK (
                       transaction_type IN (
                         'purchase','sale','transfer_in','transfer_out',
                         'adjustment','opening_stock','return','damage','production'
                       )),
  reference_type     VARCHAR(30) CHECK (
                       reference_type IN ('invoice','purchase_order','transfer','manual')),
  reference_id       UUID,
  client_id          UUID REFERENCES clients(id) ON DELETE SET NULL,
  batch_no           VARCHAR(100),
  serial_no          VARCHAR(100),
  qty_in             NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_out            NUMERIC(14,4) NOT NULL DEFAULT 0,
  rate               NUMERIC(12,4) NOT NULL DEFAULT 0,
  valuation_method   VARCHAR(15) NOT NULL DEFAULT 'weighted_avg'
                       CHECK (valuation_method IN ('FIFO','weighted_avg')),
  running_balance    NUMERIC(14,4) NOT NULL DEFAULT 0,
  transaction_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes              TEXT,
  created_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_org_id        ON stock_ledger(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id       ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse_id  ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_client_id     ON stock_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_txn_date      ON stock_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_ref           ON stock_ledger(reference_id);

-- 7. stock_summary  (materialised, updated via trigger or service)
CREATE TABLE IF NOT EXISTS stock_summary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id)    ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES items(id)         ON DELETE CASCADE,
  variant_id          UUID         REFERENCES item_variants(id)  ON DELETE SET NULL,
  batch_no            VARCHAR(100),
  qty_on_hand         NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_reserved        NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_available       NUMERIC(14,4) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  avg_cost            NUMERIC(12,4) NOT NULL DEFAULT 0,
  last_purchase_rate  NUMERIC(12,4) NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, item_id, variant_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_stock_summary_warehouse_id ON stock_summary(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_summary_item_id      ON stock_summary(item_id);

-- 8. purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id               UUID,
  supplier_client_id      UUID NOT NULL REFERENCES clients(id)      ON DELETE RESTRICT,
  po_number               VARCHAR(50) NOT NULL UNIQUE,
  po_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date  DATE,
  warehouse_id            UUID NOT NULL REFERENCES warehouses(id)   ON DELETE RESTRICT,
  status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','partial','received','cancelled')),
  subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes                   TEXT,
  created_by              UUID NOT NULL REFERENCES users(id)        ON DELETE RESTRICT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_id            ON purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_client   ON purchase_orders(supplier_client_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse         ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status            ON purchase_orders(status);

-- 9. purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id         UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id)           ON DELETE RESTRICT,
  variant_id    UUID         REFERENCES item_variants(id)    ON DELETE SET NULL,
  hsn_sac_code  VARCHAR(20),
  qty_ordered   NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_received  NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price    NUMERIC(12,4) NOT NULL DEFAULT 0,
  gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 18,
  gst_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  batch_no      VARCHAR(100),
  expected_date DATE
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id   ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item_id ON purchase_order_items(item_id);

-- 10. stock_transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  transfer_no       VARCHAR(50) NOT NULL UNIQUE,
  transfer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id)    ON DELETE RESTRICT,
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id)    ON DELETE RESTRICT,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','in_transit','received','cancelled')),
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES users(id)         ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_org_id ON stock_transfers(org_id);

-- 11. stock_transfer_items
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id      UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES items(id)           ON DELETE RESTRICT,
  variant_id       UUID         REFERENCES item_variants(id)    ON DELETE SET NULL,
  batch_no         VARCHAR(100),
  serial_no        VARCHAR(100),
  qty_transferred  NUMERIC(14,4) NOT NULL DEFAULT 0,
  qty_received     NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_cost        NUMERIC(12,4) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON stock_transfer_items(transfer_id);
