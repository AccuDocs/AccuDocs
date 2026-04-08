/**
 * Data Migration Script — Client GST Module
 * Creates: client_sales, client_purchases, client_expenses, data_uploads tables
 * Creates: client_gst_summary VIEW
 * Safe: Uses IF NOT EXISTS throughout
 *
 * Usage: npx ts-node src/scripts/run-data-migration.ts
 */
import { pool } from '../config/database.config';

const MIGRATION_SQL = `
-- ============================================================
-- 1. SALES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  invoice_no      VARCHAR(50)   NOT NULL,
  invoice_date    DATE          NOT NULL,
  customer_name   VARCHAR(200)  NOT NULL,
  description     TEXT,
  hsn_sac_code    VARCHAR(20),
  quantity        DECIMAL(12,3) DEFAULT 1,
  rate            DECIMAL(14,2),
  base_amount     DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate        DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
  gst_amount      DECIMAL(14,2) GENERATED ALWAYS AS (base_amount * gst_rate / 100) STORED,
  total_amount    DECIMAL(14,2) GENERATED ALWAYS AS (base_amount + (base_amount * gst_rate / 100)) STORED,
  month           INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  financial_year  VARCHAR(9)    NOT NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_client ON client_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_month ON client_sales(client_id, month, financial_year);

-- ============================================================
-- 2. PURCHASES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  bill_no         VARCHAR(50)   NOT NULL,
  bill_date       DATE          NOT NULL,
  vendor_name     VARCHAR(200)  NOT NULL,
  description     TEXT,
  hsn_sac_code    VARCHAR(20),
  quantity        DECIMAL(12,3) DEFAULT 1,
  rate            DECIMAL(14,2),
  base_amount     DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate        DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
  gst_amount      DECIMAL(14,2) GENERATED ALWAYS AS (base_amount * gst_rate / 100) STORED,
  total_amount    DECIMAL(14,2) GENERATED ALWAYS AS (base_amount + (base_amount * gst_rate / 100)) STORED,
  month           INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  financial_year  VARCHAR(9)    NOT NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_client ON client_purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_purchases_client_month ON client_purchases(client_id, month, financial_year);

-- ============================================================
-- 3. EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  expense_date    DATE          NOT NULL,
  category        VARCHAR(50)   NOT NULL DEFAULT 'general',
  description     TEXT          NOT NULL,
  vendor_name     VARCHAR(200),
  amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_mode    VARCHAR(30)   DEFAULT 'cash',
  reference_no    VARCHAR(50),
  month           INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  financial_year  VARCHAR(9)    NOT NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_client ON client_expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client_month ON client_expenses(client_id, month, financial_year);

-- ============================================================
-- 4. DATA UPLOADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS data_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES users(id),

  upload_type     VARCHAR(20)   NOT NULL CHECK (upload_type IN ('sales', 'purchases', 'expenses')),
  file_name       VARCHAR(255)  NOT NULL,
  rows_imported   INTEGER       NOT NULL DEFAULT 0,
  rows_failed     INTEGER       NOT NULL DEFAULT 0,
  error_log       JSONB         DEFAULT '[]'::jsonb,
  status          VARCHAR(20)   NOT NULL DEFAULT 'completed',

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_client ON data_uploads(client_id);

-- ============================================================
-- 5. GST SUMMARY VIEW (computed from sales + purchases)
-- ============================================================
CREATE OR REPLACE VIEW client_gst_summary AS
SELECT
  COALESCE(s.client_id, p.client_id)       AS client_id,
  COALESCE(s.organization_id, p.organization_id) AS organization_id,
  COALESCE(s.month, p.month)               AS month,
  COALESCE(s.financial_year, p.financial_year) AS financial_year,
  COALESCE(s.total_sales, 0)               AS total_sales,
  COALESCE(s.output_gst, 0)               AS output_gst,
  COALESCE(p.total_purchases, 0)           AS total_purchases,
  COALESCE(p.input_gst, 0)                AS input_gst,
  (COALESCE(s.output_gst, 0) - COALESCE(p.input_gst, 0)) AS gst_payable
FROM
  (SELECT client_id, organization_id, month, financial_year,
          SUM(base_amount)  AS total_sales,
          SUM(gst_amount)   AS output_gst
   FROM client_sales
   GROUP BY client_id, organization_id, month, financial_year) s
FULL OUTER JOIN
  (SELECT client_id, organization_id, month, financial_year,
          SUM(base_amount)  AS total_purchases,
          SUM(gst_amount)   AS input_gst
   FROM client_purchases
   GROUP BY client_id, organization_id, month, financial_year) p
ON s.client_id = p.client_id
   AND s.month = p.month
   AND s.financial_year = p.financial_year;
`;

async function runMigration() {
  console.log('🚀 Starting Data Module migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log('   - client_sales table created');
    console.log('   - client_purchases table created');
    console.log('   - client_expenses table created');
    console.log('   - data_uploads table created');
    console.log('   - client_gst_summary view created');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
