'use strict';

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: '16.16.137.174',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'AccuDocs2026!',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const client = await pool.connect();
  try {
    console.log('Checking super_admins table columns...');
    const columnsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'super_admins'
    `);
    const columns = columnsRes.rows.map(r => r.column_name);
    console.log('Existing columns:', columns.join(', '));

    if (!columns.includes('role')) {
        console.log('Adding "role" column to super_admins...');
        await client.query("ALTER TABLE super_admins ADD COLUMN role VARCHAR(20) DEFAULT 'super_admin'");
    }
    if (!columns.includes('is_active')) {
        console.log('Adding "is_active" column to super_admins...');
        await client.query("ALTER TABLE super_admins ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
    }

    const res = await client.query('SELECT id, email FROM super_admins');
    console.log('Existing Super Admins:', res.rows.length);
    res.rows.forEach(r => console.log(` - ${r.email}`));

    if (res.rows.length === 0) {
      console.log('No super admins found. Inserting a test admin...');
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      await client.query(
        'INSERT INTO super_admins (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, TRUE)',
        ['Test Admin', 'admin@accudocs.com', hashedPassword, 'super_admin']
      );
      console.log('Test admin created: admin@accudocs.com / Admin@123');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
