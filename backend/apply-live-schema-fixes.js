#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function getColumns(client, tableName) {
  const { rows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName]
  );

  return rows.map((row) => row.column_name);
}

async function dropCheckConstraints(client, tableName, definitionMatch) {
  const { rows } = await client.query(
    `
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = $1
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE $2
    `,
    [tableName, `%${definitionMatch}%`]
  );

  for (const row of rows) {
    await client.query(`ALTER TABLE ${quoteIdent(tableName)} DROP CONSTRAINT IF EXISTS ${quoteIdent(row.conname)}`);
  }
}

async function constraintExists(client, constraintName) {
  const { rowCount } = await client.query(
    `
      SELECT 1
      FROM pg_constraint
      WHERE conname = $1
      LIMIT 1
    `,
    [constraintName]
  );

  return rowCount > 0;
}

async function ensureConstraint(client, constraintName, ddl) {
  if (await constraintExists(client, constraintName)) {
    return;
  }

  await client.query(ddl);
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    await client.query('BEGIN');

    const superAdminColumns = await getColumns(client, 'super_admins');

    if (superAdminColumns.includes('password') && !superAdminColumns.includes('password_hash')) {
      console.log('Renaming super_admins.password -> password_hash');
      await client.query('ALTER TABLE super_admins RENAME COLUMN password TO password_hash');
    }

    console.log('Ensuring super_admins.role exists');
    await client.query('ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS role VARCHAR(20)');

    console.log('Normalizing super_admin role values');
    await client.query(`
      UPDATE super_admins
      SET role = CASE
        WHEN role IS NULL THEN 'super_admin'
        WHEN role = 'admin' THEN 'super_admin'
        ELSE role
      END
      WHERE role IS NULL OR role = 'admin'
    `);

    const invalidRoles = await client.query(`
      SELECT DISTINCT role
      FROM super_admins
      WHERE role IS NOT NULL
        AND role NOT IN ('super_admin', 'read_only_admin')
    `);

    if (invalidRoles.rows.length > 0) {
      throw new Error(
        `Unexpected super_admins.role values: ${invalidRoles.rows.map((row) => row.role).join(', ')}`
      );
    }

    await dropCheckConstraints(client, 'super_admins', 'role');

    console.log('Applying super_admins.role constraint/default');
    await client.query(`
      ALTER TABLE super_admins
      ALTER COLUMN password_hash SET NOT NULL,
      ALTER COLUMN role SET DEFAULT 'super_admin',
      ALTER COLUMN role SET NOT NULL
    `);
    await client.query(`
      ALTER TABLE super_admins
      ADD CONSTRAINT super_admins_role_check
      CHECK (role IN ('super_admin', 'read_only_admin'))
    `);

    console.log('Refreshing organizations.subscription_plan check constraint');
    await dropCheckConstraints(client, 'organizations', 'subscription_plan');
    await client.query(`
      ALTER TABLE organizations
      ADD CONSTRAINT organizations_subscription_plan_check
      CHECK (subscription_plan IN ('trial', 'starter', 'professional', 'enterprise'))
    `);

    console.log('Ensuring audit_logs.super_admin_id exists');
    await client.query(`
      ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS super_admin_id UUID NULL REFERENCES super_admins(id) ON DELETE SET NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_super_admin_id
      ON audit_logs(super_admin_id)
    `);

    console.log('Adding tenant integrity constraints');
    await ensureConstraint(
      client,
      'uq_users_id_org',
      'ALTER TABLE users ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id)'
    );
    await ensureConstraint(
      client,
      'uq_clients_id_org',
      'ALTER TABLE clients ADD CONSTRAINT uq_clients_id_org UNIQUE (id, organization_id)'
    );
    await ensureConstraint(
      client,
      'uq_folders_id_org',
      'ALTER TABLE folders ADD CONSTRAINT uq_folders_id_org UNIQUE (id, organization_id)'
    );

    await ensureConstraint(
      client,
      'fk_clients_user_org',
      `ALTER TABLE clients
       ADD CONSTRAINT fk_clients_user_org
       FOREIGN KEY (user_id, organization_id)
       REFERENCES users(id, organization_id)
       NOT VALID`
    );
    await client.query('ALTER TABLE clients VALIDATE CONSTRAINT fk_clients_user_org');

    await ensureConstraint(
      client,
      'fk_years_client_org',
      `ALTER TABLE years
       ADD CONSTRAINT fk_years_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       ON DELETE CASCADE
       NOT VALID`
    );
    await client.query('ALTER TABLE years VALIDATE CONSTRAINT fk_years_client_org');

    await ensureConstraint(
      client,
      'fk_folders_client_org',
      `ALTER TABLE folders
       ADD CONSTRAINT fk_folders_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       ON DELETE CASCADE
       NOT VALID`
    );
    await client.query('ALTER TABLE folders VALIDATE CONSTRAINT fk_folders_client_org');

    await ensureConstraint(
      client,
      'fk_documents_client_org',
      `ALTER TABLE documents
       ADD CONSTRAINT fk_documents_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       ON DELETE CASCADE
       NOT VALID`
    );
    await client.query('ALTER TABLE documents VALIDATE CONSTRAINT fk_documents_client_org');

    await ensureConstraint(
      client,
      'fk_documents_folder_org',
      `ALTER TABLE documents
       ADD CONSTRAINT fk_documents_folder_org
       FOREIGN KEY (folder_id, organization_id)
       REFERENCES folders(id, organization_id)
       ON DELETE SET NULL
       NOT VALID`
    );
    await client.query('ALTER TABLE documents VALIDATE CONSTRAINT fk_documents_folder_org');

    await ensureConstraint(
      client,
      'fk_recurring_templates_client_org',
      `ALTER TABLE recurring_invoice_templates
       ADD CONSTRAINT fk_recurring_templates_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       ON DELETE CASCADE
       NOT VALID`
    );
    await client.query('ALTER TABLE recurring_invoice_templates VALIDATE CONSTRAINT fk_recurring_templates_client_org');

    await ensureConstraint(
      client,
      'fk_invoices_client_org',
      `ALTER TABLE invoices
       ADD CONSTRAINT fk_invoices_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       NOT VALID`
    );
    await client.query('ALTER TABLE invoices VALIDATE CONSTRAINT fk_invoices_client_org');

    await ensureConstraint(
      client,
      'fk_payments_client_org',
      `ALTER TABLE payments
       ADD CONSTRAINT fk_payments_client_org
       FOREIGN KEY (client_id, organization_id)
       REFERENCES clients(id, organization_id)
       ON DELETE CASCADE
       NOT VALID`
    );
    await client.query('ALTER TABLE payments VALIDATE CONSTRAINT fk_payments_client_org');

    await client.query('COMMIT');
    console.log('Schema fixes committed.');

    const finalSuperAdminColumns = await getColumns(client, 'super_admins');
    const finalAuditLogColumns = await getColumns(client, 'audit_logs');
    const finalConstraints = await client.query(`
      SELECT rel.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname IN ('super_admins', 'organizations', 'audit_logs')
        AND con.contype = 'c'
        AND (
          pg_get_constraintdef(con.oid) LIKE '%role%'
          OR pg_get_constraintdef(con.oid) LIKE '%subscription_plan%'
        )
      ORDER BY rel.relname, con.conname
    `);

    console.log('\nFinal super_admins columns:');
    console.log(finalSuperAdminColumns.join(', '));

    console.log('\nFinal audit_logs columns:');
    console.log(finalAuditLogColumns.join(', '));

    console.log('\nRelevant check constraints:');
    for (const row of finalConstraints.rows) {
      console.log(`- ${row.table_name}.${row.conname}: ${row.definition}`);
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }

    console.error('Schema fix failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
