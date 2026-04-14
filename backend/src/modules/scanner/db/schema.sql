CREATE SCHEMA IF NOT EXISTS document_scanner;

CREATE OR REPLACE FUNCTION document_scanner.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS document_scanner.documents (
  id                  SERIAL PRIMARY KEY,
  organization_id     UUID NOT NULL,
  doc_type            VARCHAR(20) NOT NULL CHECK (doc_type IN ('sale', 'purchase', 'expense')),
  document_number     VARCHAR(100),
  doc_date            DATE,
  vendor_or_customer  VARCHAR(255),
  gstin               VARCHAR(20),
  subtotal            NUMERIC(14,2),
  tax_amount          NUMERIC(14,2),
  discount            NUMERIC(14,2),
  total_amount        NUMERIC(14,2),
  currency            VARCHAR(10) DEFAULT 'INR',
  payment_mode        VARCHAR(50),
  notes               TEXT,
  email               VARCHAR(255),
  phone               VARCHAR(30),
  ocr_confidence      SMALLINT,
  s3_url              TEXT,
  s3_key              TEXT,
  local_path          TEXT,
  image_filename      VARCHAR(255),
  raw_ocr_text        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_scanner.line_items (
  id                  SERIAL PRIMARY KEY,
  document_id         INTEGER REFERENCES document_scanner.documents(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  quantity            NUMERIC(12,3),
  unit_price          NUMERIC(14,2),
  amount              NUMERIC(14,2),
  hsn_sac_code        VARCHAR(20),
  tax_rate_percent    NUMERIC(5,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_documents ON document_scanner.documents;
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON document_scanner.documents
  FOR EACH ROW
  EXECUTE FUNCTION document_scanner.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scanner_documents_doc_type ON document_scanner.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_scanner_documents_doc_date ON document_scanner.documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_scanner_documents_vendor ON document_scanner.documents(vendor_or_customer);
CREATE INDEX IF NOT EXISTS idx_scanner_documents_deleted_at ON document_scanner.documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_scanner_documents_organization ON document_scanner.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_scanner_line_items_document_id ON document_scanner.line_items(document_id);
