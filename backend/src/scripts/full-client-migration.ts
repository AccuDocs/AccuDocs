import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function fullMigration() {
  try {
    await connectDatabase();
    console.log('🚀 Starting full migration...');

    // 1. Get view definition
    const [viewResults]: any[] = await sequelize.query(
      "SELECT definition FROM pg_views WHERE viewname = 'v_client_summary'"
    );

    let viewDef = null;
    if (viewResults && viewResults.length > 0) {
      viewDef = viewResults[0].definition;
      console.log('✅ Found view v_client_summary definition');
    }

    // 2. Drop view
    if (viewDef) {
      await sequelize.query('DROP VIEW IF EXISTS v_client_summary');
      console.log('✅ Dropped view v_client_summary');
    }

    // 3. Alter columns
    await sequelize.query('ALTER TABLE clients ALTER COLUMN pan TYPE VARCHAR(25)');
    console.log('✅ Altered pan column');
    await sequelize.query('ALTER TABLE clients ALTER COLUMN pincode TYPE VARCHAR(20)');
    console.log('✅ Altered pincode column');

    // 4. Recreate view
    if (viewDef) {
      // Postgres definition usually starts with SELECT... we need CREATE OR REPLACE VIEW name AS ...
      await sequelize.query(`CREATE OR REPLACE VIEW v_client_summary AS ${viewDef}`);
      console.log('✅ Recreated view v_client_summary');
    }

    console.log('🎉 Full migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

fullMigration();
