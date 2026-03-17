import { sequelize } from '../config/database.config';
import * as fs from 'fs';

async function dumpColumns() {
  try {
    await sequelize.authenticate();
    const tables = ['invoices', 'audit_logs', 'clients', 'users', 'organizations'];
    let output = '';

    for (const table of tables) {
      const [cols] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table}';
      `);
      output += `Table: ${table}\n`;
      output += cols.map((c: any) => c.column_name).sort().join(', ') + '\n\n';
    }

    fs.writeFileSync('db_dump.txt', output);
    console.log('Dumped to db_dump.txt');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

dumpColumns();
