#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const fs = require('path');
require('dotenv').config();

const path = require('path');

async function initializeDatabase() {
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

    // Read schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('\n📋 Initializing database schema...');
    console.log('⚠️  NOTE: This will DROP and recreate all tables!');
    console.log('   Ensure you have backups if needed.\n');

    // Drop existing schema (optional - comment out if you want to preserve data)
    console.log('🗑️  Dropping existing tables...');
    const dropRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    
    for (const row of dropRes.rows) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        console.log(`  ✓ Dropped ${row.tablename}`);
      } catch (err) {
        console.log(`  ⚠️  Could not drop ${row.tablename}: ${err.message}`);
      }
    }

    // Execute schema
    console.log('\n📝 Executing schema.sql...');
    try {
      await client.query(schema);
      console.log('✅ Schema created successfully!');
    } catch (err) {
      console.error('❌ Error executing schema:');
      console.error(err.message);
      if (err.position) {
        const pos = parseInt(err.position);
        const start = Math.max(0, pos - 100);
        const end = Math.min(schema.length, pos + 100);
        console.error('Context near error:');
        console.error('...', schema.substring(start, end), '...');
      }
      throw err;
    }

    // Verify tables exist
    console.log('\n✔️  Verifying tables...');
    const tablesRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const tables = tablesRes.rows.map(r => r.tablename);
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(tbl => console.log(`  - ${tbl}`));

    console.log('\n✨ Database initialization complete!');

  } catch (err) {
    console.error('\n❌ Initialization failed:');
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeDatabase();
