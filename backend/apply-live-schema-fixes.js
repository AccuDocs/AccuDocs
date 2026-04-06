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
