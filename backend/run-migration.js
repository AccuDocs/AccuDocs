const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:AccuDocs2026!@16.16.137.174:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  
  console.log('Reading migration file...');
  const sql = fs.readFileSync('d:\\AccuDocs-1\\database\\migrations\\010_inventory_schema.sql', 'utf8');
  
  console.log('Executing migration...');
  await client.query(sql);
  
  console.log('Migration successful! Inventory schema created.');
  await client.end();
}

run().catch(e => { 
  console.error('Migration failed:', e.message); 
  process.exit(1); 
});
