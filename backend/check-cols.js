const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:AccuDocs2026!@16.16.137.174:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => {
  return client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'item_categories';");
}).then(res => {
  console.log(res.rows.map(r => r.column_name));
  client.end();
}).catch(console.error);
