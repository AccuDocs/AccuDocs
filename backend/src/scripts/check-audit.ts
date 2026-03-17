import 'reflect-metadata';
import '../main/container';
import { sequelize } from '../config/database.config';

async function checkAudit() {
  try {
    await sequelize.authenticate();
    const columns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs';
    `);
    console.log('Columns in audit_logs:', columns[0].map((c: any) => c.column_name));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAudit();
