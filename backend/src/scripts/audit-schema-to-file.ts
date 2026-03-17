import { sequelize } from '../config/database.config';
import { QueryTypes } from 'sequelize';
import * as fs from 'fs';

async function auditSchemaToFile() {
  const tables = ['documents', 'tasks', 'audit_logs'];
  let output = '';
  for (const table of tables) {
    output += `\nAudit for ${table}:\n`;
    const cols = await sequelize.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`,
      { type: QueryTypes.SELECT }
    ) as any[];
    for (const col of cols) {
      output += `  - ${col.column_name} (${col.data_type})\n`;
    }
  }
  fs.writeFileSync('schema_audit.txt', output);
  console.log('Audit saved to schema_audit.txt');
  process.exit(0);
}

auditSchemaToFile();
