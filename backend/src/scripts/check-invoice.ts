import { sequelize } from '../config/database.config';

async function checkColumns() {
  try {
    await sequelize.authenticate();
    const [invCols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices';
    `);
    console.log('Columns in invoices:', invCols.map((c: any) => c.column_name).sort());

    const [auditCols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs';
    `);
    console.log('Columns in audit_logs:', auditCols.map((c: any) => c.column_name).sort());
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkColumns();
