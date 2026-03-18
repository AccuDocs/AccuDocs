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

async function reset() {
  const client = await pool.connect();
  try {
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await client.query(
      'UPDATE super_admins SET password_hash = $1, role = $2, is_active = TRUE WHERE email = $3',
      [hashedPassword, 'super_admin', 'admin@accudocs.app']
    );
    console.log('Password reset for admin@accudocs.app to Admin@123');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
