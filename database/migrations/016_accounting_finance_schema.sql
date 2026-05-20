-- ============================================================
-- Migration 016: Enterprise Accounting & Finance Schema
-- AccuDocs - Double-entry, journal-based accounting backbone
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_accounting_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed for accounting table %. Use reversal, cancellation, or deleted_at.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Organization structure
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_code       VARCHAR(30) NOT NULL,
  name              VARCHAR(160) NOT NULL,
  gstin             VARCHAR(15),
  state_code        CHAR(2) NOT NULL,
  address           TEXT,
  is_head_office    BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','closed')),
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branches_org_code_unique UNIQUE (organization_id, branch_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_one_head_office
  ON branches(organization_id)
  WHERE is_head_office = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_org_status
  ON branches(organization_id, status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_branches ON branches;
CREATE TRIGGER set_updated_at_branches
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS cost_centers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  code              VARCHAR(30) NOT NULL,
  name              VARCHAR(160) NOT NULL,
  center_type       VARCHAR(30) NOT NULL DEFAULT 'department'
                    CHECK (center_type IN ('department','project','branch','product','customer','campaign','other')),
  manager_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','closed')),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cost_centers_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org_parent
  ON cost_centers(organization_id, parent_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_cost_centers ON cost_centers;
CREATE TRIGGER set_updated_at_cost_centers
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS fiscal_years (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  VARCHAR(30) NOT NULL,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','soft_locked','hard_locked','closing','closed')),
  allow_backdated_until DATE,
  closed_at             TIMESTAMPTZ,
  closed_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  retained_earnings_entry_id UUID,
  closing_snapshot      JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fiscal_years_dates_check CHECK (start_date < end_date),
  CONSTRAINT fiscal_years_org_name_unique UNIQUE (organization_id, name),
  CONSTRAINT fiscal_years_org_dates_unique UNIQUE (organization_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_org_status
  ON fiscal_years(organization_id, status);

DROP TRIGGER IF EXISTS set_updated_at_fiscal_years ON fiscal_years;
CREATE TRIGGER set_updated_at_fiscal_years
  BEFORE UPDATE ON fiscal_years
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Chart of accounts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS account_groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES account_groups(id) ON DELETE RESTRICT,
  code              VARCHAR(40) NOT NULL,
  name              VARCHAR(180) NOT NULL,
  group_type        VARCHAR(20) NOT NULL
                    CHECK (group_type IN ('asset','liability','equity','income','expense')),
  normal_balance    VARCHAR(10) NOT NULL
                    CHECK (normal_balance IN ('debit','credit')),
  report_section    VARCHAR(60),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  system_defined    BOOLEAN NOT NULL DEFAULT FALSE,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive')),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_groups_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_account_groups_org_type
  ON account_groups(organization_id, group_type)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_account_groups ON account_groups;
CREATE TRIGGER set_updated_at_account_groups
  BEFORE UPDATE ON account_groups
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_group_id       UUID NOT NULL REFERENCES account_groups(id) ON DELETE RESTRICT,
  parent_account_id      UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  cost_center_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  account_code           VARCHAR(50) NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  account_type           VARCHAR(20) NOT NULL
                        CHECK (account_type IN ('asset','liability','equity','income','expense')),
  sub_type               VARCHAR(60),
  normal_balance         VARCHAR(10) NOT NULL
                        CHECK (normal_balance IN ('debit','credit')),
  control_type           VARCHAR(40)
                        CHECK (control_type IN (
                          'receivable','payable','bank','cash','tax_input','tax_output',
                          'inventory','cogs','revenue','expense','tds','tcs','rounding',
                          'opening','retained_earnings','fixed_asset','depreciation'
                        )),
  currency_code          CHAR(3) NOT NULL DEFAULT 'INR',
  is_control_account     BOOLEAN NOT NULL DEFAULT FALSE,
  allow_manual_posting   BOOLEAN NOT NULL DEFAULT TRUE,
  opening_balance        NUMERIC(18,2) NOT NULL DEFAULT 0,
  opening_balance_type   VARCHAR(10) NOT NULL DEFAULT 'debit'
                        CHECK (opening_balance_type IN ('debit','credit')),
  opening_balance_date   DATE,
  current_balance        NUMERIC(18,2) NOT NULL DEFAULT 0,
  gst_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  hsn_sac_code           VARCHAR(20),
  status                 VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','blocked')),
  system_defined         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_org_code_unique UNIQUE (organization_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_org_type
  ON accounts(organization_id, account_type, control_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_org_group
  ON accounts(organization_id, account_group_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_search
  ON accounts USING GIN ((account_code || ' ' || name) gin_trgm_ops);

DROP TRIGGER IF EXISTS set_updated_at_accounts ON accounts;
CREATE TRIGGER set_updated_at_accounts
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Customer accounting profile. Existing operational customer master remains clients.
CREATE TABLE IF NOT EXISTS customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  account_id         UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  customer_code      VARCHAR(50) NOT NULL,
  display_name       VARCHAR(200) NOT NULL,
  gstin              VARCHAR(15),
  pan                VARCHAR(10),
  credit_limit       NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_days        INTEGER NOT NULL DEFAULT 0,
  opening_balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
  opening_balance_type VARCHAR(10) NOT NULL DEFAULT 'debit'
                    CHECK (opening_balance_type IN ('debit','credit')),
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','blocked')),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_org_code_unique UNIQUE (organization_id, customer_code),
  CONSTRAINT customers_client_unique UNIQUE (organization_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_org_account
  ON customers(organization_id, account_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_customers ON customers;
CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opening_balance_type VARCHAR(10) NOT NULL DEFAULT 'credit'
      CHECK (opening_balance_type IN ('debit','credit'));
    CREATE INDEX IF NOT EXISTS idx_vendors_org_account
      ON vendors(organization_id, account_id)
      WHERE deleted_at IS NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS taxes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  VARCHAR(120) NOT NULL,
  tax_type               VARCHAR(30) NOT NULL
                        CHECK (tax_type IN ('gst_output','gst_input','tds','tcs','cess','rounding','other')),
  tax_component          VARCHAR(20) NOT NULL
                        CHECK (tax_component IN ('cgst','sgst','igst','cess','tds','tcs','none')),
  rate                  NUMERIC(7,4) NOT NULL DEFAULT 0,
  payable_account_id     UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  receivable_account_id  UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  effective_from         DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to           DATE,
  is_reverse_charge      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT taxes_effective_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_taxes_org_component_rate
  ON taxes(organization_id, tax_component, rate)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_taxes ON taxes;
CREATE TRIGGER set_updated_at_taxes
  BEFORE UPDATE ON taxes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS bank_accounts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id                   UUID REFERENCES branches(id) ON DELETE SET NULL,
  account_id                  UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  bank_name                   VARCHAR(160) NOT NULL,
  account_holder_name         VARCHAR(180),
  account_number_masked       VARCHAR(40) NOT NULL,
  account_number_encrypted    TEXT,
  ifsc_code                   VARCHAR(20),
  swift_code                  VARCHAR(20),
  upi_id                      VARCHAR(120),
  currency_code               CHAR(3) NOT NULL DEFAULT 'INR',
  opening_balance             NUMERIC(18,2) NOT NULL DEFAULT 0,
  opening_balance_date        DATE,
  current_statement_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_default                  BOOLEAN NOT NULL DEFAULT FALSE,
  status                      VARCHAR(20) NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','inactive','closed')),
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bank_accounts_org_account_unique UNIQUE (organization_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_status
  ON bank_accounts(organization_id, status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_bank_accounts ON bank_accounts;
CREATE TRIGGER set_updated_at_bank_accounts
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Vouchers and journals
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vouchers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id         UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  branch_id              UUID REFERENCES branches(id) ON DELETE RESTRICT,
  cost_center_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  voucher_type           VARCHAR(40) NOT NULL
                        CHECK (voucher_type IN (
                          'sales_invoice','purchase_invoice','receipt','payment',
                          'credit_note','debit_note','journal','contra','expense',
                          'stock_transfer','opening','closing','gst_settlement',
                          'bank_reconciliation'
                        )),
  voucher_no             VARCHAR(80) NOT NULL,
  voucher_date           DATE NOT NULL,
  source_module          VARCHAR(40) NOT NULL,
  source_type            VARCHAR(60) NOT NULL,
  source_id              UUID,
  party_type             VARCHAR(30) NOT NULL DEFAULT 'none'
                        CHECK (party_type IN ('customer','vendor','employee','bank','none')),
  party_id               UUID,
  total_debit            NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit           NUMERIC(18,2) NOT NULL DEFAULT 0,
  narration              TEXT,
  status                 VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending_approval','approved','posted','reversed','cancelled')),
  approval_status        VARCHAR(30) NOT NULL DEFAULT 'not_required'
                        CHECK (approval_status IN ('not_required','pending','approved','rejected')),
  submitted_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at            TIMESTAMPTZ,
  posted_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at              TIMESTAMPTZ,
  reversed_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  reversed_at            TIMESTAMPTZ,
  reversal_voucher_id    UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  locked_at              TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vouchers_debit_credit_match CHECK (ROUND(total_debit, 2) = ROUND(total_credit, 2)),
  CONSTRAINT vouchers_org_type_no_unique UNIQUE (organization_id, voucher_type, voucher_no)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_org_date
  ON vouchers(organization_id, voucher_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_source
  ON vouchers(organization_id, source_module, source_type, source_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_status
  ON vouchers(organization_id, status, approval_status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_vouchers ON vouchers;
CREATE TRIGGER set_updated_at_vouchers
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS journal_entries (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id            UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  branch_id                 UUID REFERENCES branches(id) ON DELETE RESTRICT,
  voucher_id                UUID REFERENCES vouchers(id) ON DELETE RESTRICT,
  entry_no                  VARCHAR(80) NOT NULL,
  entry_date                DATE NOT NULL,
  posting_date              DATE NOT NULL,
  source_module             VARCHAR(40) NOT NULL,
  source_type               VARCHAR(60) NOT NULL,
  source_id                 UUID,
  narration                 TEXT,
  currency_code             CHAR(3) NOT NULL DEFAULT 'INR',
  exchange_rate             NUMERIC(18,8) NOT NULL DEFAULT 1,
  total_debit               NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit              NUMERIC(18,2) NOT NULL DEFAULT 0,
  status                    VARCHAR(30) NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','pending_approval','approved','posted','reversed','void')),
  is_system_generated       BOOLEAN NOT NULL DEFAULT TRUE,
  idempotency_key           VARCHAR(160),
  auto_posting_batch_id     UUID,
  lock_version              INTEGER NOT NULL DEFAULT 0,
  approved_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at               TIMESTAMPTZ,
  posted_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at                 TIMESTAMPTZ,
  reversal_entry_id         UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  deleted_at                TIMESTAMPTZ,
  created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journal_entries_amounts_nonnegative CHECK (total_debit >= 0 AND total_credit >= 0),
  CONSTRAINT journal_entries_org_no_unique UNIQUE (organization_id, entry_no),
  CONSTRAINT journal_entries_idempotency_unique UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_org_posting
  ON journal_entries(organization_id, posting_date DESC, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_source
  ON journal_entries(organization_id, source_module, source_type, source_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_voucher
  ON journal_entries(voucher_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_journal_entries ON journal_entries;
CREATE TRIGGER set_updated_at_journal_entries
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  journal_entry_id       UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no                INTEGER NOT NULL,
  account_id             UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  branch_id              UUID REFERENCES branches(id) ON DELETE RESTRICT,
  cost_center_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  party_type             VARCHAR(30) CHECK (party_type IN ('customer','vendor','employee','bank','tax','none')),
  party_id               UUID,
  item_id                UUID REFERENCES items(id) ON DELETE SET NULL,
  tax_id                 UUID REFERENCES taxes(id) ON DELETE SET NULL,
  debit_amount           NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency_code          CHAR(3) NOT NULL DEFAULT 'INR',
  exchange_rate          NUMERIC(18,8) NOT NULL DEFAULT 1,
  base_debit_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  base_credit_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  description            TEXT,
  reference_type         VARCHAR(60),
  reference_id           UUID,
  tax_rate               NUMERIC(7,4),
  gst_component          VARCHAR(20) CHECK (gst_component IN ('cgst','sgst','igst','cess','none')),
  hsn_sac_code           VARCHAR(20),
  quantity               NUMERIC(18,4),
  unit_rate              NUMERIC(18,4),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journal_entry_lines_one_side_check CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  ),
  CONSTRAINT journal_entry_lines_base_one_side_check CHECK (
    (base_debit_amount > 0 AND base_credit_amount = 0) OR
    (base_credit_amount > 0 AND base_debit_amount = 0)
  ),
  CONSTRAINT journal_entry_lines_line_unique UNIQUE (journal_entry_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_org_account_date
  ON journal_entry_lines(organization_id, account_id, journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_party
  ON journal_entry_lines(organization_id, party_type, party_id)
  WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_lines_cost_center
  ON journal_entry_lines(organization_id, cost_center_id)
  WHERE cost_center_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_lines_ref
  ON journal_entry_lines(organization_id, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION check_journal_entry_balanced(p_entry_id UUID)
RETURNS VOID AS $$
DECLARE
  v_status TEXT;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_lines INTEGER;
BEGIN
  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = p_entry_id;

  IF v_status IN ('approved','posted') THEN
    SELECT
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0),
      COUNT(*)
    INTO v_debit, v_credit, v_lines
    FROM journal_entry_lines
    WHERE journal_entry_id = p_entry_id;

    IF v_lines < 2 OR ROUND(v_debit, 2) <> ROUND(v_credit, 2) THEN
      RAISE EXCEPTION 'Journal entry % is not balanced: debit %, credit %, lines %', p_entry_id, v_debit, v_credit, v_lines;
    END IF;

    UPDATE journal_entries
       SET total_debit = v_debit,
           total_credit = v_credit,
           updated_at = NOW()
     WHERE id = p_entry_id
       AND (total_debit <> v_debit OR total_credit <> v_credit);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assert_journal_entry_balanced_from_entry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_journal_entry_balanced(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assert_journal_entry_balanced_from_line()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_journal_entry_balanced(NEW.journal_entry_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assert_journal_balanced_on_status') THEN
    CREATE CONSTRAINT TRIGGER assert_journal_balanced_on_status
      AFTER INSERT OR UPDATE OF status ON journal_entries
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION assert_journal_entry_balanced_from_entry();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'assert_journal_balanced_on_lines') THEN
    CREATE CONSTRAINT TRIGGER assert_journal_balanced_on_lines
      AFTER INSERT OR UPDATE ON journal_entry_lines
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION assert_journal_entry_balanced_from_line();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ledger_balances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id         UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  account_id             UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  cost_center_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  period_month           DATE NOT NULL,
  opening_debit          NUMERIC(18,2) NOT NULL DEFAULT 0,
  opening_credit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  period_debit           NUMERIC(18,2) NOT NULL DEFAULT 0,
  period_credit          NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_debit          NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_credit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  last_journal_entry_id  UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  is_closed              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ledger_balances_month_check CHECK (period_month = date_trunc('month', period_month)::date)
);

CREATE INDEX IF NOT EXISTS idx_ledger_balances_report
  ON ledger_balances(organization_id, fiscal_year_id, period_month, account_id);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_balances_unique
  ON ledger_balances(
    organization_id,
    fiscal_year_id,
    account_id,
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid),
    period_month
  );

DROP TRIGGER IF EXISTS set_updated_at_ledger_balances ON ledger_balances;
CREATE TRIGGER set_updated_at_ledger_balances
  BEFORE UPDATE ON ledger_balances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Source document accounting links
-- ------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS posting_status VARCHAR(30) NOT NULL DEFAULT 'not_posted'
      CHECK (posting_status IN ('not_posted','queued','posted','failed','reversed'));
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS revenue_recognition_status VARCHAR(30) NOT NULL DEFAULT 'recognized'
      CHECK (revenue_recognition_status IN ('deferred','partial','recognized'));
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS inventory_posting_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable'
      CHECK (inventory_posting_status IN ('not_applicable','queued','posted','failed'));
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'not_required'
      CHECK (approval_status IN ('not_required','pending','approved','rejected'));
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_invoices_accounting_status
      ON invoices(organization_id, posting_status, approval_status, invoice_date)
      WHERE deleted_at IS NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS purchases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id               UUID REFERENCES branches(id) ON DELETE SET NULL,
  cost_center_id          UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  fiscal_year_id          UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  vendor_id               UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  vendor_bill_id          UUID REFERENCES vendor_bills(id) ON DELETE SET NULL,
  purchase_no             VARCHAR(80) NOT NULL,
  supplier_invoice_no     VARCHAR(120),
  purchase_date           DATE NOT NULL,
  due_date                DATE,
  warehouse_id            UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  place_of_supply_state   CHAR(2),
  reverse_charge          BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal                NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
  taxable_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  cgst_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
  sgst_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
  igst_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
  cess_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount            NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid             NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_due             NUMERIC(18,2) NOT NULL DEFAULT 0,
  status                  VARCHAR(30) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','pending_approval','approved','posted','part_paid','paid','cancelled','reversed')),
  approval_status         VARCHAR(30) NOT NULL DEFAULT 'not_required'
                         CHECK (approval_status IN ('not_required','pending','approved','rejected')),
  posting_status          VARCHAR(30) NOT NULL DEFAULT 'not_posted'
                         CHECK (posting_status IN ('not_posted','queued','posted','failed','reversed')),
  voucher_id              UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  journal_entry_id        UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at              TIMESTAMPTZ,
  created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT purchases_org_no_unique UNIQUE (organization_id, purchase_no)
);

CREATE INDEX IF NOT EXISTS idx_purchases_org_vendor_date
  ON purchases(organization_id, vendor_id, purchase_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_accounting_status
  ON purchases(organization_id, posting_status, approval_status, purchase_date)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_purchases ON purchases;
CREATE TRIGGER set_updated_at_purchases
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(30) NOT NULL DEFAULT 'unreconciled'
      CHECK (reconciliation_status IN ('unreconciled','matched','reconciled','disputed'));
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS posting_status VARCHAR(30) NOT NULL DEFAULT 'not_posted'
      CHECK (posting_status IN ('not_posted','queued','posted','failed','reversed'));
    CREATE INDEX IF NOT EXISTS idx_payments_accounting_status
      ON payments(organization_id, posting_status, reconciliation_status, payment_date)
      WHERE deleted_at IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_payments') THEN
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL;
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(30) NOT NULL DEFAULT 'unreconciled'
      CHECK (reconciliation_status IN ('unreconciled','matched','reconciled','disputed'));
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS posting_status VARCHAR(30) NOT NULL DEFAULT 'not_posted'
      CHECK (posting_status IN ('not_posted','queued','posted','failed','reversed'));
    CREATE INDEX IF NOT EXISTS idx_vendor_payments_accounting_status
      ON vendor_payments(organization_id, posting_status, reconciliation_status, payment_date);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_allocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_source         VARCHAR(30) NOT NULL CHECK (payment_source IN ('customer_payment','vendor_payment','credit_note','debit_note','journal')),
  payment_id             UUID,
  party_type             VARCHAR(20) NOT NULL CHECK (party_type IN ('customer','vendor')),
  party_id               UUID NOT NULL,
  source_document_type   VARCHAR(40) NOT NULL,
  source_document_id     UUID NOT NULL,
  allocated_amount       NUMERIC(18,2) NOT NULL CHECK (allocated_amount > 0),
  allocation_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  journal_entry_id       UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reversed_at            TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_party
  ON payment_allocations(organization_id, party_type, party_id, allocation_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_source_doc
  ON payment_allocations(organization_id, source_document_type, source_document_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_payment_allocations ON payment_allocations;
CREATE TRIGGER set_updated_at_payment_allocations
  BEFORE UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Inventory valuation accounting
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  fiscal_year_id         UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  warehouse_id           UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  item_id                UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  variant_id             UUID REFERENCES item_variants(id) ON DELETE SET NULL,
  stock_ledger_id        UUID REFERENCES stock_ledger(id) ON DELETE SET NULL,
  transaction_type       VARCHAR(40) NOT NULL
                        CHECK (transaction_type IN (
                          'purchase_receipt','sales_issue','sales_return','purchase_return',
                          'transfer_out','transfer_in','adjustment_in','adjustment_out',
                          'opening_stock','damage','production_issue','production_receipt'
                        )),
  transaction_date       DATE NOT NULL,
  quantity               NUMERIC(18,4) NOT NULL CHECK (quantity >= 0),
  unit_cost              NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_value            NUMERIC(18,2) NOT NULL DEFAULT 0,
  valuation_method       VARCHAR(20) NOT NULL DEFAULT 'weighted_avg'
                        CHECK (valuation_method IN ('FIFO','weighted_avg')),
  source_module          VARCHAR(40) NOT NULL,
  source_type            VARCHAR(60) NOT NULL,
  source_id              UUID,
  voucher_id             UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  journal_entry_id       UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  status                 VARCHAR(30) NOT NULL DEFAULT 'posted'
                        CHECK (status IN ('draft','posted','reversed','cancelled')),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org_item_date
  ON inventory_transactions(organization_id, item_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
  ON inventory_transactions(organization_id, source_module, source_type, source_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_inventory_transactions ON inventory_transactions;
CREATE TRIGGER set_updated_at_inventory_transactions
  BEFORE UPDATE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS stock_valuation (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id                   UUID REFERENCES branches(id) ON DELETE SET NULL,
  fiscal_year_id              UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  warehouse_id                UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  item_id                     UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  variant_id                  UUID REFERENCES item_variants(id) ON DELETE SET NULL,
  batch_no                    VARCHAR(100),
  valuation_date              DATE NOT NULL,
  qty_on_hand                 NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_cost                    NUMERIC(18,4) NOT NULL DEFAULT 0,
  fifo_layers                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  source_inventory_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL,
  is_period_close_snapshot    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_valuation_org_date
  ON stock_valuation(organization_id, valuation_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS stock_valuation_unique
  ON stock_valuation(
    organization_id,
    warehouse_id,
    item_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(batch_no, ''),
    valuation_date
  );

DROP TRIGGER IF EXISTS set_updated_at_stock_valuation ON stock_valuation;
CREATE TRIGGER set_updated_at_stock_valuation
  BEFORE UPDATE ON stock_valuation
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Bank reconciliation
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reconciliation (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id              UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  bank_account_id             UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  statement_period_start      DATE NOT NULL,
  statement_period_end        DATE NOT NULL,
  opening_statement_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_statement_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_balance                NUMERIC(18,2) NOT NULL DEFAULT 0,
  unreconciled_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
  status                      VARCHAR(30) NOT NULL DEFAULT 'imported'
                              CHECK (status IN ('imported','in_progress','reconciled','locked','cancelled')),
  reconciled_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  reconciled_at               TIMESTAMPTZ,
  locked_by                   UUID REFERENCES users(id) ON DELETE SET NULL,
  locked_at                   TIMESTAMPTZ,
  notes                       TEXT,
  deleted_at                  TIMESTAMPTZ,
  created_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reconciliation_period_check CHECK (statement_period_start <= statement_period_end)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_org_bank_period
  ON reconciliation(organization_id, bank_account_id, statement_period_start, statement_period_end)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_reconciliation ON reconciliation;
CREATE TRIGGER set_updated_at_reconciliation
  BEFORE UPDATE ON reconciliation
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS reconciliation_lines (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reconciliation_id            UUID NOT NULL REFERENCES reconciliation(id) ON DELETE CASCADE,
  statement_date               DATE NOT NULL,
  value_date                   DATE,
  description                  TEXT NOT NULL,
  reference_number             VARCHAR(160),
  debit_amount                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount                NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_after                NUMERIC(18,2),
  match_status                 VARCHAR(30) NOT NULL DEFAULT 'unmatched'
                              CHECK (match_status IN ('unmatched','suggested','matched','ignored','disputed')),
  matched_journal_entry_line_id UUID REFERENCES journal_entry_lines(id) ON DELETE SET NULL,
  matched_payment_id           UUID,
  confidence_score             NUMERIC(5,2),
  matched_by                   UUID REFERENCES users(id) ON DELETE SET NULL,
  matched_at                   TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reconciliation_lines_one_side_check CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_lines_match
  ON reconciliation_lines(organization_id, reconciliation_id, match_status);

CREATE INDEX IF NOT EXISTS idx_reconciliation_lines_reference
  ON reconciliation_lines(organization_id, statement_date, reference_number);

DROP TRIGGER IF EXISTS set_updated_at_reconciliation_lines ON reconciliation_lines;
CREATE TRIGGER set_updated_at_reconciliation_lines
  BEFORE UPDATE ON reconciliation_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Recurring accounting and automation
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recurring_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  cost_center_id         UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  template_name          VARCHAR(180) NOT NULL,
  source_type            VARCHAR(40) NOT NULL CHECK (source_type IN ('invoice','purchase','journal','expense')),
  schedule_type          VARCHAR(30) NOT NULL CHECK (schedule_type IN ('daily','weekly','monthly','quarterly','yearly','custom')),
  cron_expression        VARCHAR(120),
  start_date             DATE NOT NULL,
  end_date               DATE,
  next_run_date          DATE NOT NULL,
  last_run_at            TIMESTAMPTZ,
  auto_post              BOOLEAN NOT NULL DEFAULT FALSE,
  approval_required      BOOLEAN NOT NULL DEFAULT TRUE,
  journal_template       JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_template        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                 VARCHAR(30) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','completed','cancelled')),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_entries_due
  ON recurring_entries(organization_id, next_run_date, status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_recurring_entries ON recurring_entries;
CREATE TRIGGER set_updated_at_recurring_entries
  BEFORE UPDATE ON recurring_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS accounting_posting_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_type           VARCHAR(40) NOT NULL,
  status               VARCHAR(30) NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  source_count         INTEGER NOT NULL DEFAULT 0,
  posted_count         INTEGER NOT NULL DEFAULT 0,
  failed_count         INTEGER NOT NULL DEFAULT 0,
  requested_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  error_summary        TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_accounting_posting_batches ON accounting_posting_batches;
CREATE TRIGGER set_updated_at_accounting_posting_batches
  BEFORE UPDATE ON accounting_posting_batches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS accounting_event_outbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_module      VARCHAR(40) NOT NULL,
  source_type        VARCHAR(60) NOT NULL,
  source_id          UUID NOT NULL,
  event_type         VARCHAR(80) NOT NULL,
  idempotency_key    VARCHAR(180) NOT NULL,
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','processed','failed','dead_letter')),
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_error         TEXT,
  available_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounting_event_outbox_idempotent UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_accounting_outbox_pending
  ON accounting_event_outbox(status, available_at, created_at)
  WHERE status IN ('pending','failed');

DROP TRIGGER IF EXISTS set_updated_at_accounting_event_outbox ON accounting_event_outbox;
CREATE TRIGGER set_updated_at_accounting_event_outbox
  BEFORE UPDATE ON accounting_event_outbox
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS approval_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type        VARCHAR(60) NOT NULL,
  entity_id          UUID NOT NULL,
  approval_level     INTEGER NOT NULL DEFAULT 1,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approver_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  rejected_at        TIMESTAMPTZ,
  comments           TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity
  ON approval_requests(organization_id, entity_type, entity_id, status);

DROP TRIGGER IF EXISTS set_updated_at_approval_requests ON approval_requests;
CREATE TRIGGER set_updated_at_approval_requests
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS period_locks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id     UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  lock_type          VARCHAR(30) NOT NULL CHECK (lock_type IN ('soft','hard','gst','inventory','bank','full')),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  reason             TEXT,
  locked_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  locked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  unlocked_at        TIMESTAMPTZ,
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','released')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT period_locks_dates_check CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_period_locks_active
  ON period_locks(organization_id, fiscal_year_id, period_start, period_end, lock_type)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS set_updated_at_period_locks ON period_locks;
CREATE TRIGGER set_updated_at_period_locks
  BEFORE UPDATE ON period_locks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS financial_close_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id         UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  branch_id              UUID REFERENCES branches(id) ON DELETE SET NULL,
  status                 VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','validation_failed','ready','closing','closed','cancelled')),
  checklist              JSONB NOT NULL DEFAULT '{}'::jsonb,
  trial_balance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  pnl_snapshot           JSONB NOT NULL DEFAULT '{}'::jsonb,
  balance_sheet_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  retained_earnings_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  started_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at             TIMESTAMPTZ,
  closed_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_close_runs_org_year
  ON financial_close_runs(organization_id, fiscal_year_id, status);

DROP TRIGGER IF EXISTS set_updated_at_financial_close_runs ON financial_close_runs;
CREATE TRIGGER set_updated_at_financial_close_runs
  BEFORE UPDATE ON financial_close_runs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS accounting_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  default_branch_id                UUID REFERENCES branches(id) ON DELETE SET NULL,
  receivable_control_account_id    UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  payable_control_account_id       UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  sales_revenue_account_id         UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  purchase_account_id              UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  inventory_account_id             UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  cogs_account_id                  UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  cash_account_id                  UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  bank_charges_account_id          UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  rounding_account_id              UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  retained_earnings_account_id     UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  auto_post_sales_invoices         BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_purchase_invoices      BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_payments               BOOLEAN NOT NULL DEFAULT TRUE,
  require_approval_over_amount     NUMERIC(18,2),
  base_currency_code               CHAR(3) NOT NULL DEFAULT 'INR',
  settings                         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounting_settings_org_unique UNIQUE (organization_id)
);

DROP TRIGGER IF EXISTS set_updated_at_accounting_settings ON accounting_settings;
CREATE TRIGGER set_updated_at_accounting_settings
  BEFORE UPDATE ON accounting_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- Audit log hardening for accounting
-- ------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE SEQUENCE IF NOT EXISTS audit_logs_accounting_sequence_seq;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS accounting_sequence BIGINT DEFAULT nextval('audit_logs_accounting_sequence_seq');
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source_module VARCHAR(40);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(128);
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_hash VARCHAR(128);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_accounting
      ON audit_logs(organization_id, source_module, fiscal_year_id, created_at DESC);
  END IF;
END $$;

-- ------------------------------------------------------------
-- Hard-delete guardrails
-- ------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_account_groups') THEN
    CREATE TRIGGER prevent_delete_account_groups BEFORE DELETE ON account_groups
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_accounts') THEN
    CREATE TRIGGER prevent_delete_accounts BEFORE DELETE ON accounts
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_vouchers') THEN
    CREATE TRIGGER prevent_delete_vouchers BEFORE DELETE ON vouchers
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_journal_entries') THEN
    CREATE TRIGGER prevent_delete_journal_entries BEFORE DELETE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_journal_entry_lines') THEN
    CREATE TRIGGER prevent_delete_journal_entry_lines BEFORE DELETE ON journal_entry_lines
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_ledger_balances') THEN
    CREATE TRIGGER prevent_delete_ledger_balances BEFORE DELETE ON ledger_balances
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_inventory_transactions') THEN
    CREATE TRIGGER prevent_delete_inventory_transactions BEFORE DELETE ON inventory_transactions
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_stock_valuation') THEN
    CREATE TRIGGER prevent_delete_stock_valuation BEFORE DELETE ON stock_valuation
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_delete_reconciliation') THEN
    CREATE TRIGGER prevent_delete_reconciliation BEFORE DELETE ON reconciliation
      FOR EACH ROW EXECUTE FUNCTION prevent_accounting_hard_delete();
  END IF;
END $$;

COMMENT ON TABLE journal_entries IS 'Double-entry journal header. Reports must derive from this table and journal_entry_lines only.';
COMMENT ON TABLE journal_entry_lines IS 'Immutable accounting lines. Each posted journal must balance debit and credit.';
COMMENT ON TABLE ledger_balances IS 'Optional monthly balance cache rebuilt from posted journal_entry_lines.';
COMMENT ON TABLE accounting_event_outbox IS 'Transactional outbox for event-driven accounting posting.';
