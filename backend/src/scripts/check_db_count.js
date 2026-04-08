const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.clntxofvekyyepvshqpe:Antigravity%40123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  try {
    const clientId = '4b403662-2141-4434-b89f-ebd73a5e22ae';
    const res = await pool.query('SELECT count(*) FROM client_purchases WHERE client_id = $1', [clientId]);
    console.log(`Total purchases in DB for client: ${res.rows[0].count}`);
    
    const res2 = await pool.query('SELECT bill_no, bill_date, financial_year, organization_id FROM client_purchases WHERE client_id = $1 LIMIT 5', [clientId]);
    console.log('Sample rows:', res2.rows);
    
    const res3 = await pool.query('SELECT organization_id FROM clients WHERE id = $1', [clientId]);
     console.log('Client Org ID:', res3.rows[0]?.organization_id);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
