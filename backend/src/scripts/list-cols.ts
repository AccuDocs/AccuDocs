import { sequelize } from '../config/database.config';
import { QueryTypes } from 'sequelize';

async function listAllCols() {
  const tables = ['documents', 'tasks', 'audit_logs', 'invoices', 'clients'];
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    const cols = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`,
      { type: QueryTypes.SELECT }
    ) as any[];
    console.log(cols.map(c => c.column_name).join(', '));
  }
  process.exit(0);
}

listAllCols();
