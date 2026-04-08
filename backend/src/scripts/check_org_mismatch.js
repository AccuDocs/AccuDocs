const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const clientId = '4b403662-2141-4434-b89f-ebd73a5e22ae';
  try {
    const res = await pool.query('SELECT organization_id, count(*) FROM client_purchases WHERE client_id = $1 GROUP BY organization_id', [clientId]);
    console.log('Purchases grouping by Org ID:', res.rows);
    
    const res2 = await pool.query('SELECT organization_id FROM clients WHERE id = $1', [clientId]);
    console.log('Actual Client Org ID:', res2.rows[0]?.organization_id);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
