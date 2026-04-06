const { sequelize } = require('./src/config/database.config');

async function checkTables() {
  try {
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('checklists', 'checklist_templates', 'compliance_deadlines', 'client_deadlines')
    `);
    console.log('Existing tables:', results.map(r => r.table_name));
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    process.exit();
  }
}

checkTables();
