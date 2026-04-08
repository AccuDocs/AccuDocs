/**
 * GST V2 Migration — Full GST-compliant schema upgrade
 * - ALTERs: client_sales, client_purchases, client_expenses
 * - Creates: gst_returns, validation_errors, activity_log
 * - Updates: client_gst_summary view
 *
 * Safe: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout
 * Usage: npx ts-node src/scripts/gst-v2-migration.ts
 */
import { pool } from '../config/database.config';

const MIGRATION_SQL = `
-- ============================================================
-- 1. ALTER client_sales — GST-compliant fields
-- ============================================================
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'B2B';
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS place_of_supply CHAR(2);
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS cess_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS is_nil_rated BOOLEAN DEFAULT false;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS is_advance BOOLEAN DEFAULT false;
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE client_sales ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 2. ALTER client_purchases — ITC + RCM fields
-- ============================================================
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(30) DEFAULT 'local';
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS itc_eligible BOOLEAN DEFAULT true;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS rcm_applicable BOOLEAN DEFAULT false;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS is_capital_goods BOOLEAN DEFAULT false;
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE client_purchases ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 3. ALTER client_expenses — GST tracking
-- ============================================================
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT false;
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS itc_allowed BOOLEAN DEFAULT false;
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS itc_blocked_reason VARCHAR(100);
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE client_expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 4. GST RETURNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS gst_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  return_type     VARCHAR(20)   NOT NULL CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-2B', 'GSTR-9')),
  period_month    INTEGER       NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER       NOT NULL,
  financial_year  VARCHAR(9)    NOT NULL,

  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'draft', 'validated', 'filed', 'revised')),
  due_date        DATE,
  filed_date      DATE,
  filed_by        UUID REFERENCES users(id),
  arn             VARCHAR(50),
  json_data       JSONB         DEFAULT '{}'::jsonb,
  pdf_url         VARCHAR(512),
  remarks         TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gst_returns_client ON gst_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_period ON gst_returns(client_id, return_type, period_month, period_year);

-- ============================================================
-- 5. VALIDATION ERRORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS validation_errors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  error_category  VARCHAR(30)   NOT NULL DEFAULT 'data'
                    CHECK (error_category IN ('data', 'compliance', 'system')),
  error_type      VARCHAR(50)   NOT NULL,
  severity        VARCHAR(10)   NOT NULL DEFAULT 'warning'
                    CHECK (severity IN ('error', 'warning', 'info')),
  message         TEXT          NOT NULL,

  entity_type     VARCHAR(20)   NOT NULL CHECK (entity_type IN ('sale', 'purchase', 'expense')),
  entity_id       UUID          NOT NULL,
  field_name      VARCHAR(50),

  is_resolved     BOOLEAN       NOT NULL DEFAULT false,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,

  financial_year  VARCHAR(9)    NOT NULL,
  month           INTEGER,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_val_errors_client ON validation_errors(client_id);
CREATE INDEX IF NOT EXISTS idx_val_errors_unresolved ON validation_errors(client_id, is_resolved) WHERE NOT is_resolved;

-- ============================================================
-- 6. ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),

  action          VARCHAR(50)   NOT NULL,
  entity_type     VARCHAR(30),
  entity_id       UUID,
  details         JSONB         DEFAULT '{}'::jsonb,
  ip_address      VARCHAR(45),

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_client ON activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(client_id, created_at DESC);

-- ============================================================
-- 7. UPDATE GST SUMMARY VIEW — include ITC filtering + RCM
-- ============================================================
DROP VIEW IF EXISTS client_gst_summary;
CREATE VIEW client_gst_summary AS
SELECT
  COALESCE(s.client_id, p.client_id)       AS client_id,
  COALESCE(s.organization_id, p.organization_id) AS organization_id,
  COALESCE(s.month, p.month)               AS month,
  COALESCE(s.financial_year, p.financial_year) AS financial_year,
  COALESCE(s.total_sales, 0)               AS total_sales,
  COALESCE(s.output_gst, 0)               AS output_gst,
  COALESCE(s.output_cgst, 0)              AS output_cgst,
  COALESCE(s.output_sgst, 0)              AS output_sgst,
  COALESCE(s.output_igst, 0)              AS output_igst,
  COALESCE(s.b2b_count, 0)                AS b2b_count,
  COALESCE(s.b2b_value, 0)                AS b2b_value,
  COALESCE(s.b2c_count, 0)                AS b2c_count,
  COALESCE(s.b2c_value, 0)                AS b2c_value,
  COALESCE(s.export_count, 0)             AS export_count,
  COALESCE(s.export_value, 0)             AS export_value,
  COALESCE(p.total_purchases, 0)           AS total_purchases,
  COALESCE(p.input_gst, 0)                AS input_gst,
  COALESCE(p.input_cgst, 0)               AS input_cgst,
  COALESCE(p.input_sgst, 0)               AS input_sgst,
  COALESCE(p.input_igst, 0)               AS input_igst,
  COALESCE(p.itc_eligible_count, 0)       AS itc_eligible_count,
  COALESCE(p.itc_eligible_value, 0)       AS itc_eligible_value,
  COALESCE(p.itc_blocked_count, 0)        AS itc_blocked_count,
  COALESCE(p.itc_blocked_value, 0)        AS itc_blocked_value,
  COALESCE(p.rcm_count, 0)               AS rcm_count,
  COALESCE(p.rcm_value, 0)               AS rcm_value,
  (COALESCE(s.output_gst, 0) - COALESCE(p.input_gst_eligible, 0)) AS gst_payable
FROM
  (SELECT
     client_id, organization_id, month, financial_year,
     SUM(base_amount)      AS total_sales,
     SUM(gst_amount)       AS output_gst,
     SUM(cgst_amount)      AS output_cgst,
     SUM(sgst_amount)      AS output_sgst,
     SUM(igst_amount)      AS output_igst,
     COUNT(*) FILTER (WHERE invoice_type = 'B2B')    AS b2b_count,
     SUM(base_amount) FILTER (WHERE invoice_type = 'B2B')  AS b2b_value,
     COUNT(*) FILTER (WHERE invoice_type = 'B2C')    AS b2c_count,
     SUM(base_amount) FILTER (WHERE invoice_type = 'B2C')  AS b2c_value,
     COUNT(*) FILTER (WHERE invoice_type = 'EXPORT')  AS export_count,
     SUM(base_amount) FILTER (WHERE invoice_type = 'EXPORT') AS export_value
   FROM client_sales
   GROUP BY client_id, organization_id, month, financial_year) s
FULL OUTER JOIN
  (SELECT
     client_id, organization_id, month, financial_year,
     SUM(base_amount)      AS total_purchases,
     SUM(gst_amount)       AS input_gst,
     SUM(cgst_amount)      AS input_cgst,
     SUM(sgst_amount)      AS input_sgst,
     SUM(igst_amount)      AS input_igst,
     SUM(gst_amount) FILTER (WHERE itc_eligible = true AND rcm_applicable = false) AS input_gst_eligible,
     COUNT(*) FILTER (WHERE itc_eligible = true)   AS itc_eligible_count,
     SUM(base_amount) FILTER (WHERE itc_eligible = true) AS itc_eligible_value,
     COUNT(*) FILTER (WHERE itc_eligible = false)  AS itc_blocked_count,
     SUM(base_amount) FILTER (WHERE itc_eligible = false) AS itc_blocked_value,
     COUNT(*) FILTER (WHERE rcm_applicable = true) AS rcm_count,
     SUM(gst_amount) FILTER (WHERE rcm_applicable = true) AS rcm_value
   FROM client_purchases
   GROUP BY client_id, organization_id, month, financial_year) p
ON s.client_id = p.client_id
   AND s.organization_id = p.organization_id
   AND s.month = p.month
   AND s.financial_year = p.financial_year;
`;

async function runMigration() {
  console.log('🚀 Starting GST V2 migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('✅ GST V2 Migration completed successfully!');
    console.log('   ✓ client_sales — 11 new columns added');
    console.log('   ✓ client_purchases — 10 new columns added');
    console.log('   ✓ client_expenses — 7 new columns added');
    console.log('   ✓ gst_returns table created');
    console.log('   ✓ validation_errors table created');
    console.log('   ✓ activity_log table created');
    console.log('   ✓ client_gst_summary view updated');
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
