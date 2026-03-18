'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host: '16.16.137.174',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'AccuDocs2026!',
  ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
  const client = await pool.connect();
  try {
    console.log('Checking columns...');
    const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'super_admins'
    `);
    const columns = res.rows.map(r => r.column_name);
    console.log('Columns:', columns.join(', '));

    if (columns.includes('password') && !columns.includes('password_hash')) {
        console.log('Renaming password to password_hash...');
        await client.query('ALTER TABLE super_admins RENAME COLUMN password TO password_hash');
    }
    if (columns.includes('last_login') && !columns.includes('last_login_at')) {
        console.log('Renaming last_login to last_login_at...');
        await client.query('ALTER TABLE super_admins RENAME COLUMN last_login TO last_login_at');
    }
    console.log('Schema fixed.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
