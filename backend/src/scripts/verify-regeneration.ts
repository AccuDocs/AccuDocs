import { sequelize } from '../config/database.config';
import { QueryTypes } from 'sequelize';

async function verifyRegeneration() {
  try {
    console.log('--- Verifying Database Regeneration ---');
    await sequelize.authenticate();

    // Get all tables in the public schema
    const tables = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      { type: QueryTypes.SELECT }
    ) as any[];

    console.log(`Found ${tables.length} tables:`);
    for (const table of tables) {
      const colStatus = await sequelize.query(
        `SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = '${table.table_name}'`,
        { type: QueryTypes.SELECT }
      ) as any[];
      console.log(`- ${table.table_name} (${colStatus[0].count} columns)`);
    }

    console.log('--- Verification Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyRegeneration();
