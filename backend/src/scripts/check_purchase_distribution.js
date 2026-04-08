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
    const res = await pool.query('SELECT financial_year, month, count(*) FROM client_purchases WHERE client_id = $1 GROUP BY financial_year, month', [clientId]);
    console.log('Purchases grouping by FY/Month:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
