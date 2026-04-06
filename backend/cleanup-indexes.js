#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function cleanupIndexes() {
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };

  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all indexes for recurring_invoice_templates table
    const indexRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'recurring_invoice_templates'
      ORDER BY indexname
    `);

    console.log('\n📋 Indexes on recurring_invoice_templates:');
    indexRes.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.indexname}`);
    });

    // Drop duplicate/problematic indexes
    // The pattern "recurring_invoice_templates_organization_id_is_active_next_invo" is likely a Sequelize-generated index
    const indexesToDrop = [
      'recurring_invoice_templates_organization_id_is_active_next_invo'
    ];

    for (const indexName of indexesToDrop) {
      const existsRes = await client.query(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'recurring_invoice_templates' AND indexname = $1
      `, [indexName]);

      if (existsRes.rows.length > 0) {
        console.log(`\n🔄 Dropping index: ${indexName}`);
        await client.query(`DROP INDEX IF EXISTS ${indexName} CASCADE`);
        console.log(`✅ Index ${indexName} dropped successfully`);
      } else {
        console.log(`\n⏭️  Index ${indexName} does not exist, skipping`);
      }
    }

    // Also drop other potentially problematic auto-generated indexes
    console.log('\n🔍 Checking for other duplicate indexes...');
    const allIndexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename NOT IN ('pg_toast_*', 'information_schema.*')
      AND indexname LIKE '%_pk'
      ORDER BY indexname
    `);

    console.log(`Found ${allIndexes.rows.length} primary key indexes (expected).\n`);

    // Check for missing expected indexes from schema.sql
    console.log('📊 Verifying expected indexes exist...');
    const expectedIndexes = [
      'idx_rec_client_id',
      'idx_rec_org_id',
      'idx_rec_active_due'
    ];

    for (const idxName of expectedIndexes) {
      const res = await client.query(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'recurring_invoice_templates' AND indexname = $1
      `, [idxName]);

      if (res.rows.length > 0) {
        console.log(`  ✅ ${idxName} exists`);
      } else {
        console.log(`  ⚠️  ${idxName} MISSING - you may need to recreate it`);
      }
    }

    console.log('\n✨ Cleanup complete!');

  } catch (err) {
    console.error('\n❌ Error during cleanup:');
    console.error('Message:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupIndexes();
