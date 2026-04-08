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
  try {
    const res = await pool.query(`
      SELECT column_name, is_generated, generation_expression 
      FROM information_schema.columns 
      WHERE table_name = 'client_purchases'
    `);
    console.log('Columns for client_purchases:', res.rows);
    
    const res2 = await pool.query(`
      SELECT column_name, is_generated, generation_expression 
      FROM information_schema.columns 
      WHERE table_name = 'client_sales'
    `);
    console.log('Columns for client_sales:', res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
