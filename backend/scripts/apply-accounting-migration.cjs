const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Client } = require('pg');
const dotenv = require('dotenv');

const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');
dotenv.config({ path: path.join(backendDir, '.env') });

const migrationPath = path.join(repoRoot, 'database', 'migrations', '016_accounting_finance_schema.sql');
const backupDir = path.join(repoRoot, 'database', 'backups');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
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

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function fetchRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function buildBackup(client) {
  const tables = await fetchRows(client, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const backup = {
    metadata: {
      generatedAt: new Date().toISOString(),
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      schema: 'public',
      migrationToApply: path.basename(migrationPath),
    },
    schema: {
      columns: await fetchRows(client, `
        SELECT table_name, column_name, ordinal_position, data_type, udt_name,
               is_nullable, column_default, character_maximum_length,
               numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `),
      constraints: await fetchRows(client, `
        SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
               kcu.column_name, ccu.table_name AS foreign_table_name,
               ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
      `),
      indexes: await fetchRows(client, `
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `),
      triggers: await fetchRows(client, `
        SELECT event_object_table AS table_name, trigger_name, action_timing,
               event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `),
    },
    rowCounts: {},
    data: {},
  };

  for (const { table_name: tableName } of tables) {
    const qualifiedTable = `public.${quoteIdent(tableName)}`;
    const [{ count }] = await fetchRows(client, `SELECT COUNT(*)::bigint AS count FROM ${qualifiedTable}`);
    backup.rowCounts[tableName] = Number(count);
    backup.data[tableName] = await fetchRows(client, `SELECT * FROM ${qualifiedTable}`);
    console.log(`Backed up ${tableName}: ${count} rows`);
  }

  return backup;
}

async function writeBackup(backup) {
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `pre_accounting_migration_${timestampForFile()}.json.gz`);
  const json = JSON.stringify(backup, null, 2);
  fs.writeFileSync(backupPath, zlib.gzipSync(json));
  return backupPath;
}

async function applyMigration(client) {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function verifyMigration(client) {
  const requiredTables = [
    'account_groups',
    'accounts',
    'journal_entries',
    'journal_entry_lines',
    'vouchers',
    'ledger_balances',
    'fiscal_years',
    'branches',
    'cost_centers',
    'bank_accounts',
    'reconciliation',
    'inventory_transactions',
    'stock_valuation',
    'recurring_entries',
  ];

  const rows = await fetchRows(client, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [requiredTables]);

  const found = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !found.has(table));
  if (missing.length > 0) {
    throw new Error(`Migration verification failed. Missing tables: ${missing.join(', ')}`);
  }

  const invoiceColumns = await fetchRows(client, `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name IN ('voucher_id', 'journal_entry_id', 'posting_status')
  `);

  if (invoiceColumns.length < 3) {
    throw new Error('Migration verification failed. Invoice accounting columns are incomplete.');
  }
}

async function main() {
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const client = new Client(dbConfig());
  await client.connect();

  try {
    console.log(`Connected to ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    console.log('Creating pre-migration backup...');
    const backupPath = await writeBackup(await buildBackup(client));
    console.log(`Backup created: ${backupPath}`);

    console.log(`Applying migration: ${migrationPath}`);
    await applyMigration(client);

    console.log('Verifying migration...');
    await verifyMigration(client);
    console.log('Accounting migration applied and verified successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Accounting migration failed.');
  console.error(error.message);
  if (error.detail) console.error(`Detail: ${error.detail}`);
  if (error.hint) console.error(`Hint: ${error.hint}`);
  if (error.position) console.error(`Position: ${error.position}`);
  process.exit(1);
});
