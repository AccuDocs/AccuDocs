-- Vendor Management + Accounts Payable
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_code VARCHAR(30) NOT NULL,
  vendor_name VARCHAR(180) NOT NULL,
  business_name VARCHAR(220),
  vendor_type VARCHAR(40) NOT NULL DEFAULT 'goods_supplier',
  gst_number VARCHAR(15),
  pan_number VARCHAR(25),
  contact_person VARCHAR(150),
  mobile VARCHAR(20),
  email VARCHAR(150),
  billing_address TEXT,
  shipping_address TEXT,
  payment_terms VARCHAR(120),
  credit_days INTEGER NOT NULL DEFAULT 0,
  credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT vendors_org_code_unique UNIQUE (organization_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org_status ON vendors(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_org_type ON vendors(organization_id, vendor_type);

CREATE TABLE IF NOT EXISTS vendor_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  po_number VARCHAR(50) NOT NULL,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  approval_note TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_po_org_number_unique UNIQUE (organization_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_po_org_vendor ON vendor_purchase_orders(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_po_org_status ON vendor_purchase_orders(organization_id, status);

CREATE TABLE IF NOT EXISTS vendor_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES vendor_purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hsn_sac_code VARCHAR(20),
  quantity NUMERIC(14, 3) NOT NULL DEFAULT 1,
  rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vendor_po_items_po ON vendor_purchase_order_items(purchase_order_id);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES vendor_purchase_orders(id) ON DELETE SET NULL,
  bill_number VARCHAR(80) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  category VARCHAR(120),
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  attachment_url VARCHAR(600),
  duplicate_key VARCHAR(220),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT vendor_bill_unique UNIQUE (organization_id, vendor_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_bills_org_status ON vendor_bills(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_org_due ON vendor_bills(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_duplicate ON vendor_bills(duplicate_key);

CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  bill_id UUID REFERENCES vendor_bills(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer',
  reference_number VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_org_vendor ON vendor_payments(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_bill ON vendor_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(payment_date);

CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  document_type VARCHAR(40) NOT NULL DEFAULT 'other',
  name VARCHAR(220) NOT NULL,
  file_url VARCHAR(600),
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_org_vendor ON vendor_documents(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_type ON vendor_documents(document_type);
