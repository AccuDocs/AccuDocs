import { sequelize } from '../config/database.config';
import { QueryTypes } from 'sequelize';

async function auditSchema() {
  const tables = ['documents', 'tasks', 'audit_logs'];
  for (const table of tables) {
    console.log(`\nAudit for ${table}:`);
    const cols = await sequelize.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`,
      { type: QueryTypes.SELECT }
    ) as any[];
    for (const col of cols) {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    }
  }
  process.exit(0);
}

auditSchema();
