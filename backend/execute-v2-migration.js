const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
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
    console.log('Connected.');

    const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'v1_to_v2_migration.sql'), 'utf8');
    
    // Split by semicolons, but be careful of functions/triggers
    // Actually, let's just use client.query but with better error handling
    
    console.log('Starting full query execution...');
    const startTime = Date.now();
    
    // Using a promise with a timeout to catch weird hangs
    const queryPromise = client.query(migrationSql);
    
    const res = await queryPromise;
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`✅ Success in ${duration}s!`);
    
  } catch (err) {
    console.error('\nERROR during migration:');
    console.error('Message:', err.message);
    if (err.position) console.error('Position:', err.position);
    if (err.where) console.error('Where:', err.where);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    
    // Log the snippet around the error position if available
    if (err.position) {
      const pos = parseInt(err.position);
      const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'v1_to_v2_migration.sql'), 'utf8');
      const start = Math.max(0, pos - 100);
      const end = Math.min(migrationSql.length, pos + 100);
      console.error('Context near error:');
      console.error('...', migrationSql.substring(start, end), '...');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
