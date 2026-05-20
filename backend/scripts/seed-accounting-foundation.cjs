const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Client } = require('pg');
const dotenv = require('dotenv');

const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');
dotenv.config({ path: path.join(backendDir, '.env') });

const backupDir = path.join(repoRoot, 'database', 'backups');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function dbConfig() {
  return {
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function normalBalance(type) {
  return ['asset', 'expense'].includes(type) ? 'debit' : 'credit';
}

function fiscalYearFor(dateValue) {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return {
    name: `FY ${startYear}-${endYearShort}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

function fiscalYearsBetween(minDate, maxDate) {
  const years = new Map();
  const current = fiscalYearFor(new Date());
  years.set(current.name, current);

  if (minDate && maxDate) {
    let cursor = fiscalYearFor(minDate).startDate;
    const last = fiscalYearFor(maxDate).startDate;
    while (cursor <= last) {
      const fy = fiscalYearFor(cursor);
      years.set(fy.name, fy);
      cursor = `${Number(cursor.slice(0, 4)) + 1}-04-01`;
    }
  }

  return Array.from(years.values()).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function maskAccountNumber(value) {
  if (!value) return 'UNSPECIFIED';
  const digits = String(value).replace(/\s+/g, '');
  if (digits.length <= 4) return `****${digits}`;
  return `${'*'.repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

async function one(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] || null;
}

async function many(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function backupAffectedTables(client) {
  fs.mkdirSync(backupDir, { recursive: true });
  const tables = [
    'organizations',
    'clients',
    'vendors',
    'invoices',
    'payments',
    'vendor_payments',
    'branches',
    'cost_centers',
    'fiscal_years',
    'account_groups',
    'accounts',
    'customers',
    'taxes',
    'bank_accounts',
    'accounting_settings',
    'audit_logs',
  ];

  const backup = {
    metadata: {
      generatedAt: new Date().toISOString(),
      type: 'pre-accounting-foundation-seed',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
    },
    data: {},
  };

  for (const table of tables) {
    const exists = await one(client, `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `, [table]);

    if (exists && exists.exists) {
      const rows = await many(client, `SELECT * FROM "${table}"`);
      backup.data[table] = rows;
      console.log(`Pre-seed backup ${table}: ${rows.length} rows`);
    }
  }

  const backupPath = path.join(backupDir, `pre_accounting_foundation_seed_${timestampForFile()}.json.gz`);
  fs.writeFileSync(backupPath, zlib.gzipSync(JSON.stringify(backup, null, 2)));
  return backupPath;
}

const groupDefinitions = [
  { code: '1000', name: 'Assets', type: 'asset', section: 'Balance Sheet / Assets', sort: 1000 },
  { code: '1100', name: 'Current Assets', type: 'asset', parent: '1000', section: 'Balance Sheet / Current Assets', sort: 1100 },
  { code: '1110', name: 'Cash and Bank', type: 'asset', parent: '1100', section: 'Balance Sheet / Cash and Bank', sort: 1110 },
  { code: '1120', name: 'Accounts Receivable', type: 'asset', parent: '1100', section: 'Balance Sheet / Receivables', sort: 1120 },
  { code: '1130', name: 'Inventory', type: 'asset', parent: '1100', section: 'Balance Sheet / Inventory', sort: 1130 },
  { code: '1140', name: 'GST Input Credit', type: 'asset', parent: '1100', section: 'Balance Sheet / Tax Assets', sort: 1140 },
  { code: '1150', name: 'Advances Given', type: 'asset', parent: '1100', section: 'Balance Sheet / Advances', sort: 1150 },
  { code: '1200', name: 'Fixed Assets', type: 'asset', parent: '1000', section: 'Balance Sheet / Fixed Assets', sort: 1200 },
  { code: '2000', name: 'Liabilities', type: 'liability', section: 'Balance Sheet / Liabilities', sort: 2000 },
  { code: '2100', name: 'Current Liabilities', type: 'liability', parent: '2000', section: 'Balance Sheet / Current Liabilities', sort: 2100 },
  { code: '2110', name: 'Accounts Payable', type: 'liability', parent: '2100', section: 'Balance Sheet / Payables', sort: 2110 },
  { code: '2120', name: 'GST and Statutory Payables', type: 'liability', parent: '2100', section: 'Balance Sheet / Tax Liabilities', sort: 2120 },
  { code: '2130', name: 'Advances Received', type: 'liability', parent: '2100', section: 'Balance Sheet / Advances', sort: 2130 },
  { code: '2200', name: 'Loans and Borrowings', type: 'liability', parent: '2000', section: 'Balance Sheet / Loans', sort: 2200 },
  { code: '3000', name: 'Equity', type: 'equity', section: 'Balance Sheet / Equity', sort: 3000 },
  { code: '3100', name: 'Capital', type: 'equity', parent: '3000', section: 'Balance Sheet / Capital', sort: 3100 },
  { code: '3200', name: 'Reserves and Surplus', type: 'equity', parent: '3000', section: 'Balance Sheet / Reserves', sort: 3200 },
  { code: '4000', name: 'Income', type: 'income', section: 'Profit and Loss / Income', sort: 4000 },
  { code: '4100', name: 'Sales and Service Revenue', type: 'income', parent: '4000', section: 'Profit and Loss / Revenue', sort: 4100 },
  { code: '4200', name: 'Other Income', type: 'income', parent: '4000', section: 'Profit and Loss / Other Income', sort: 4200 },
  { code: '5000', name: 'Expenses', type: 'expense', section: 'Profit and Loss / Expenses', sort: 5000 },
  { code: '5100', name: 'Cost of Goods Sold', type: 'expense', parent: '5000', section: 'Profit and Loss / COGS', sort: 5100 },
  { code: '5200', name: 'Operating Expenses', type: 'expense', parent: '5000', section: 'Profit and Loss / Operating Expenses', sort: 5200 },
  { code: '5300', name: 'Finance Costs', type: 'expense', parent: '5000', section: 'Profit and Loss / Finance Costs', sort: 5300 },
  { code: '5400', name: 'Tax and Rounding Expenses', type: 'expense', parent: '5000', section: 'Profit and Loss / Tax and Rounding', sort: 5400 },
];

const accountDefinitions = [
  { code: '100100', name: 'Cash in Hand', type: 'asset', group: '1110', control: 'cash' },
  { code: '100200', name: 'Main Bank Account', type: 'asset', group: '1110', control: 'bank' },
  { code: '110100', name: 'Accounts Receivable Control', type: 'asset', group: '1120', control: 'receivable', isControl: true, manual: false },
  { code: '115100', name: 'Vendor Advances', type: 'asset', group: '1150', control: 'payable' },
  { code: '120100', name: 'Inventory Asset', type: 'asset', group: '1130', control: 'inventory', isControl: true, manual: false },
  { code: '130100', name: 'Input CGST Credit', type: 'asset', group: '1140', control: 'tax_input', isControl: true, manual: false },
  { code: '130200', name: 'Input SGST Credit', type: 'asset', group: '1140', control: 'tax_input', isControl: true, manual: false },
  { code: '130300', name: 'Input IGST Credit', type: 'asset', group: '1140', control: 'tax_input', isControl: true, manual: false },
  { code: '130400', name: 'Input Cess Credit', type: 'asset', group: '1140', control: 'tax_input', isControl: true, manual: false },
  { code: '200100', name: 'Accounts Payable Control', type: 'liability', group: '2110', control: 'payable', isControl: true, manual: false },
  { code: '210100', name: 'Output CGST Payable', type: 'liability', group: '2120', control: 'tax_output', isControl: true, manual: false },
  { code: '210200', name: 'Output SGST Payable', type: 'liability', group: '2120', control: 'tax_output', isControl: true, manual: false },
  { code: '210300', name: 'Output IGST Payable', type: 'liability', group: '2120', control: 'tax_output', isControl: true, manual: false },
  { code: '210400', name: 'Output Cess Payable', type: 'liability', group: '2120', control: 'tax_output', isControl: true, manual: false },
  { code: '210500', name: 'TDS Payable', type: 'liability', group: '2120', control: 'tds', isControl: true, manual: false },
  { code: '210600', name: 'TCS Payable', type: 'liability', group: '2120', control: 'tcs', isControl: true, manual: false },
  { code: '213100', name: 'Customer Advances', type: 'liability', group: '2130', control: 'receivable' },
  { code: '300100', name: 'Capital Account', type: 'equity', group: '3100' },
  { code: '300200', name: 'Retained Earnings', type: 'equity', group: '3200', control: 'retained_earnings', isControl: true, manual: false },
  { code: '300300', name: 'Opening Balance Equity', type: 'equity', group: '3200', control: 'opening', isControl: true, manual: false },
  { code: '400100', name: 'Sales Revenue', type: 'income', group: '4100', control: 'revenue' },
  { code: '400200', name: 'Service Revenue', type: 'income', group: '4100', control: 'revenue' },
  { code: '420100', name: 'Miscellaneous Income', type: 'income', group: '4200' },
  { code: '500100', name: 'Purchases', type: 'expense', group: '5200', control: 'expense' },
  { code: '510100', name: 'Cost of Goods Sold', type: 'expense', group: '5100', control: 'cogs', isControl: true },
  { code: '520100', name: 'General Expenses', type: 'expense', group: '5200', control: 'expense' },
  { code: '520200', name: 'Ineligible GST Expense', type: 'expense', group: '5400', control: 'expense' },
  { code: '530100', name: 'Bank Charges', type: 'expense', group: '5300', control: 'expense' },
  { code: '540100', name: 'Rounding Off', type: 'expense', group: '5400', control: 'rounding' },
];

const taxComponentAccounts = {
  cgst: { input: '130100', output: '210100' },
  sgst: { input: '130200', output: '210200' },
  igst: { input: '130300', output: '210300' },
  cess: { input: '130400', output: '210400' },
};

async function seedBranch(client, org, createdBy) {
  const result = await one(client, `
    INSERT INTO branches (
      organization_id, branch_code, name, gstin, state_code, address,
      is_head_office, status, created_by
    )
    VALUES ($1, 'HO', 'Head Office', $2, $3, $4, TRUE, 'active', $5)
    ON CONFLICT (organization_id, branch_code)
    DO UPDATE SET
      name = EXCLUDED.name,
      gstin = COALESCE(branches.gstin, EXCLUDED.gstin),
      state_code = EXCLUDED.state_code,
      is_head_office = TRUE,
      status = 'active',
      updated_at = NOW()
    RETURNING id
  `, [org.id, org.gstin, org.state_code || '24', org.address, createdBy]);
  return result.id;
}

async function seedFiscalYears(client, orgId, createdBy) {
  const bounds = await one(client, `
    WITH dates AS (
      SELECT invoice_date::date AS dt FROM invoices WHERE organization_id = $1
      UNION ALL SELECT payment_date::date FROM payments WHERE organization_id = $1
      UNION ALL SELECT invoice_date::date FROM vendor_bills WHERE organization_id = $1
      UNION ALL SELECT payment_date::date FROM vendor_payments WHERE organization_id = $1
      UNION ALL SELECT transaction_date::date FROM stock_ledger WHERE org_id = $1
      UNION ALL SELECT CURRENT_DATE
    )
    SELECT MIN(dt) AS min_date, MAX(dt) AS max_date FROM dates
  `, [orgId]);

  const years = fiscalYearsBetween(bounds.min_date, bounds.max_date);
  const map = new Map();
  for (const fy of years) {
    const row = await one(client, `
      INSERT INTO fiscal_years (
        organization_id, name, start_date, end_date, status,
        allow_backdated_until, created_by
      )
      VALUES ($1, $2, $3, $4, 'open', $3, $5)
      ON CONFLICT (organization_id, name)
      DO UPDATE SET
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        updated_at = NOW()
      RETURNING id, name, start_date, end_date
    `, [orgId, fy.name, fy.startDate, fy.endDate, createdBy]);
    map.set(row.name, row);
  }
  return map;
}

async function seedGroups(client, orgId) {
  const groupIds = new Map();
  for (const group of groupDefinitions) {
    const parentId = group.parent ? groupIds.get(group.parent) : null;
    const row = await one(client, `
      INSERT INTO account_groups (
        organization_id, parent_id, code, name, group_type,
        normal_balance, report_section, sort_order, system_defined, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'active')
      ON CONFLICT (organization_id, code)
      DO UPDATE SET
        parent_id = EXCLUDED.parent_id,
        name = EXCLUDED.name,
        group_type = EXCLUDED.group_type,
        normal_balance = EXCLUDED.normal_balance,
        report_section = EXCLUDED.report_section,
        sort_order = EXCLUDED.sort_order,
        status = 'active',
        updated_at = NOW()
      RETURNING id
    `, [
      orgId,
      parentId,
      group.code,
      group.name,
      group.type,
      normalBalance(group.type),
      group.section,
      group.sort,
    ]);
    groupIds.set(group.code, row.id);
  }
  return groupIds;
}

async function seedAccounts(client, orgId, groupIds, createdBy, openingBalanceDate) {
  const accountIds = new Map();
  for (const account of accountDefinitions) {
    const row = await one(client, `
      INSERT INTO accounts (
        organization_id, account_group_id, account_code, name, account_type,
        normal_balance, control_type, currency_code, is_control_account,
        allow_manual_posting, opening_balance, opening_balance_type,
        opening_balance_date, status, system_defined, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'INR', $8, $9,
        0, $6, $10, 'active', TRUE, $11
      )
      ON CONFLICT (organization_id, account_code)
      DO UPDATE SET
        account_group_id = EXCLUDED.account_group_id,
        name = EXCLUDED.name,
        account_type = EXCLUDED.account_type,
        normal_balance = EXCLUDED.normal_balance,
        control_type = EXCLUDED.control_type,
        is_control_account = EXCLUDED.is_control_account,
        allow_manual_posting = EXCLUDED.allow_manual_posting,
        status = 'active',
        system_defined = TRUE,
        updated_at = NOW()
      RETURNING id
    `, [
      orgId,
      groupIds.get(account.group),
      account.code,
      account.name,
      account.type,
      normalBalance(account.type),
      account.control || null,
      account.isControl || false,
      account.manual !== false,
      openingBalanceDate,
      createdBy,
    ]);
    accountIds.set(account.code, row.id);
  }
  return accountIds;
}

async function seedTaxes(client, orgId, accountIds) {
  const outputRates = {
    cgst: [0, 2.5, 6, 9, 14],
    sgst: [0, 2.5, 6, 9, 14],
    igst: [0, 5, 12, 18, 28],
    cess: [0],
  };

  for (const [component, rates] of Object.entries(outputRates)) {
    for (const rate of rates) {
      for (const direction of ['input', 'output']) {
        const taxType = direction === 'input' ? 'gst_input' : 'gst_output';
        const accountId = accountIds.get(taxComponentAccounts[component][direction]);
        const exists = await one(client, `
          SELECT id
          FROM taxes
          WHERE organization_id = $1
            AND tax_type = $2
            AND tax_component = $3
            AND rate = $4
            AND effective_from = DATE '2026-04-01'
            AND deleted_at IS NULL
          LIMIT 1
        `, [orgId, taxType, component, rate]);

        if (!exists) {
          await client.query(`
            INSERT INTO taxes (
              organization_id, name, tax_type, tax_component, rate,
              payable_account_id, receivable_account_id, effective_from, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, DATE '2026-04-01', TRUE)
          `, [
            orgId,
            `${direction === 'input' ? 'Input' : 'Output'} ${component.toUpperCase()} ${rate}%`,
            taxType,
            component,
            rate,
            direction === 'output' ? accountId : null,
            direction === 'input' ? accountId : null,
          ]);
        }
      }
    }
  }

  const statutory = [
    { name: 'TDS Payable', type: 'tds', component: 'tds', account: '210500' },
    { name: 'TCS Payable', type: 'tcs', component: 'tcs', account: '210600' },
  ];
  for (const tax of statutory) {
    const exists = await one(client, `
      SELECT id
      FROM taxes
      WHERE organization_id = $1
        AND tax_type = $2
        AND tax_component = $3
        AND rate = 0
        AND deleted_at IS NULL
      LIMIT 1
    `, [orgId, tax.type, tax.component]);
    if (!exists) {
      await client.query(`
        INSERT INTO taxes (
          organization_id, name, tax_type, tax_component, rate,
          payable_account_id, effective_from, is_active
        )
        VALUES ($1, $2, $3, $4, 0, $5, DATE '2026-04-01', TRUE)
      `, [orgId, tax.name, tax.type, tax.component, accountIds.get(tax.account)]);
    }
  }
}

async function seedBankAccount(client, org, branchId, accountIds) {
  const bankAccountId = accountIds.get('100200');
  await client.query(`
    INSERT INTO bank_accounts (
      organization_id, branch_id, account_id, bank_name,
      account_holder_name, account_number_masked, ifsc_code,
      currency_code, is_default, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', TRUE, 'active')
    ON CONFLICT (organization_id, account_id)
    DO UPDATE SET
      branch_id = EXCLUDED.branch_id,
      bank_name = EXCLUDED.bank_name,
      account_holder_name = EXCLUDED.account_holder_name,
      account_number_masked = EXCLUDED.account_number_masked,
      ifsc_code = EXCLUDED.ifsc_code,
      is_default = TRUE,
      status = 'active',
      updated_at = NOW()
  `, [
    org.id,
    branchId,
    bankAccountId,
    org.bank_name || 'Default Bank',
    org.name,
    maskAccountNumber(org.bank_account_number),
    org.bank_ifsc || null,
  ]);
}

async function seedSettings(client, orgId, branchId, accountIds) {
  await client.query(`
    INSERT INTO accounting_settings (
      organization_id, default_branch_id, receivable_control_account_id,
      payable_control_account_id, sales_revenue_account_id,
      purchase_account_id, inventory_account_id, cogs_account_id,
      cash_account_id, bank_charges_account_id, rounding_account_id,
      retained_earnings_account_id, auto_post_sales_invoices,
      auto_post_purchase_invoices, auto_post_payments, base_currency_code
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, TRUE, TRUE, TRUE, 'INR'
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
      default_branch_id = EXCLUDED.default_branch_id,
      receivable_control_account_id = EXCLUDED.receivable_control_account_id,
      payable_control_account_id = EXCLUDED.payable_control_account_id,
      sales_revenue_account_id = EXCLUDED.sales_revenue_account_id,
      purchase_account_id = EXCLUDED.purchase_account_id,
      inventory_account_id = EXCLUDED.inventory_account_id,
      cogs_account_id = EXCLUDED.cogs_account_id,
      cash_account_id = EXCLUDED.cash_account_id,
      bank_charges_account_id = EXCLUDED.bank_charges_account_id,
      rounding_account_id = EXCLUDED.rounding_account_id,
      retained_earnings_account_id = EXCLUDED.retained_earnings_account_id,
      updated_at = NOW()
  `, [
    orgId,
    branchId,
    accountIds.get('110100'),
    accountIds.get('200100'),
    accountIds.get('400100'),
    accountIds.get('500100'),
    accountIds.get('120100'),
    accountIds.get('510100'),
    accountIds.get('100100'),
    accountIds.get('530100'),
    accountIds.get('540100'),
    accountIds.get('300200'),
  ]);
}

async function seedCustomers(client, orgId, accountIds) {
  const result = await client.query(`
    INSERT INTO customers (
      organization_id, client_id, account_id, customer_code, display_name,
      gstin, pan, credit_limit, credit_days, opening_balance,
      opening_balance_type, status
    )
    SELECT
      c.organization_id, c.id, $2, c.code, c.name,
      c.gstin, c.pan, c.credit_limit, 0, 0, 'debit',
      CASE WHEN c.is_active THEN 'active' ELSE 'inactive' END
    FROM clients c
    WHERE c.organization_id = $1
      AND c.deleted_at IS NULL
    ON CONFLICT (organization_id, client_id)
    DO UPDATE SET
      account_id = EXCLUDED.account_id,
      customer_code = EXCLUDED.customer_code,
      display_name = EXCLUDED.display_name,
      gstin = EXCLUDED.gstin,
      pan = EXCLUDED.pan,
      credit_limit = EXCLUDED.credit_limit,
      status = EXCLUDED.status,
      updated_at = NOW()
  `, [orgId, accountIds.get('110100')]);
  return result.rowCount;
}

async function seedVendors(client, orgId, branchId, accountIds) {
  const result = await client.query(`
    UPDATE vendors
    SET account_id = COALESCE(account_id, $2),
        branch_id = COALESCE(branch_id, $3),
        updated_at = NOW()
    WHERE organization_id = $1
      AND deleted_at IS NULL
  `, [orgId, accountIds.get('200100'), branchId]);
  return result.rowCount;
}

async function backfillSourceDocuments(client, orgId, branchId) {
  const invoiceResult = await client.query(`
    UPDATE invoices i
    SET branch_id = COALESCE(i.branch_id, $2),
        fiscal_year_id = fy.id,
        updated_at = NOW()
    FROM fiscal_years fy
    WHERE i.organization_id = $1
      AND fy.organization_id = i.organization_id
      AND i.invoice_date BETWEEN fy.start_date AND fy.end_date
      AND (i.branch_id IS NULL OR i.fiscal_year_id IS NULL)
  `, [orgId, branchId]);

  const paymentResult = await client.query(`
    UPDATE payments p
    SET branch_id = COALESCE(p.branch_id, $2),
        updated_at = NOW()
    WHERE p.organization_id = $1
      AND p.branch_id IS NULL
  `, [orgId, branchId]);

  const vendorPaymentResult = await client.query(`
    UPDATE vendor_payments vp
    SET branch_id = COALESCE(vp.branch_id, $2),
        updated_at = NOW()
    WHERE vp.organization_id = $1
      AND vp.branch_id IS NULL
  `, [orgId, branchId]);

  return {
    invoices: invoiceResult.rowCount,
    payments: paymentResult.rowCount,
    vendorPayments: vendorPaymentResult.rowCount,
  };
}

async function seedOrganization(client, org) {
  const user = await one(client, `
    SELECT id
    FROM users
    WHERE organization_id = $1
      AND deleted_at IS NULL
      AND is_active = TRUE
    ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END, created_at
    LIMIT 1
  `, [org.id]);
  const createdBy = user ? user.id : null;

  const branchId = await seedBranch(client, org, createdBy);
  const fiscalYears = await seedFiscalYears(client, org.id, createdBy);
  const currentFy = fiscalYearFor(new Date());
  const openingBalanceDate = fiscalYears.get(currentFy.name)?.start_date || currentFy.startDate;
  const groupIds = await seedGroups(client, org.id);
  const accountIds = await seedAccounts(client, org.id, groupIds, createdBy, openingBalanceDate);

  await seedTaxes(client, org.id, accountIds);
  await seedBankAccount(client, org, branchId, accountIds);
  await seedSettings(client, org.id, branchId, accountIds);
  const customers = await seedCustomers(client, org.id, accountIds);
  const vendors = await seedVendors(client, org.id, branchId, accountIds);
  const backfilled = await backfillSourceDocuments(client, org.id, branchId);

  return {
    organization: org.name,
    fiscalYears: fiscalYears.size,
    customers,
    vendors,
    backfilled,
  };
}

async function verify(client) {
  return one(client, `
    SELECT
      (SELECT COUNT(*)::int FROM organizations WHERE deleted_at IS NULL) AS organizations,
      (SELECT COUNT(*)::int FROM branches WHERE deleted_at IS NULL) AS branches,
      (SELECT COUNT(*)::int FROM fiscal_years WHERE deleted_at IS NULL) AS fiscal_years,
      (SELECT COUNT(*)::int FROM account_groups WHERE deleted_at IS NULL) AS account_groups,
      (SELECT COUNT(*)::int FROM accounts WHERE deleted_at IS NULL) AS accounts,
      (SELECT COUNT(*)::int FROM taxes WHERE deleted_at IS NULL) AS taxes,
      (SELECT COUNT(*)::int FROM bank_accounts WHERE deleted_at IS NULL) AS bank_accounts,
      (SELECT COUNT(*)::int FROM accounting_settings) AS accounting_settings,
      (SELECT COUNT(*)::int FROM customers WHERE deleted_at IS NULL) AS customers,
      (SELECT COUNT(*)::int FROM vendors WHERE deleted_at IS NULL AND account_id IS NOT NULL) AS vendors_mapped,
      (SELECT COUNT(*)::int FROM invoices WHERE deleted_at IS NULL AND branch_id IS NOT NULL AND fiscal_year_id IS NOT NULL) AS invoices_backfilled
  `);
}

async function main() {
  const client = new Client(dbConfig());
  await client.connect();
  try {
    console.log(`Connected to ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    const backupPath = await backupAffectedTables(client);
    console.log(`Pre-seed backup created: ${backupPath}`);

    const organizations = await many(client, `
      SELECT id, name, gstin, state_code, address,
             bank_name, bank_account_number, bank_ifsc
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY created_at, name
    `);

    await client.query('BEGIN');
    try {
      const summaries = [];
      for (const org of organizations) {
        summaries.push(await seedOrganization(client, org));
      }
      await client.query('COMMIT');
      for (const summary of summaries) {
        console.log(`Seeded ${summary.organization}: ${summary.fiscalYears} FY(s), ${summary.customers} customer profile writes, ${summary.vendors} vendor mappings.`);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    const counts = await verify(client);
    console.log('Verification counts:');
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Accounting foundation seed failed.');
  console.error(error.message);
  if (error.detail) console.error(`Detail: ${error.detail}`);
  if (error.hint) console.error(`Hint: ${error.hint}`);
  process.exit(1);
});
