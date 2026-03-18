const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function executeSeed() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed_v2.sql'), 'utf8');
    console.log('Read seed SQL file');

    await client.query(seedSql);
    console.log('Successfully executed seed SQL');

  } catch (err) {
    console.error('Error executing seed:', err);
  } finally {
    await client.end();
  }
}

executeSeed();
