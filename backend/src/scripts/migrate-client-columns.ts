import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function migrateClientColumns() {
  try {
    await connectDatabase();
    console.log('🚀 Altering clients table columns...');
    
    // Increase pan size
    await sequelize.query('ALTER TABLE clients ALTER COLUMN pan TYPE VARCHAR(25)');
    console.log('✅ Column pan altered to VARCHAR(25)');
    
    // Increase pincode size
    await sequelize.query('ALTER TABLE clients ALTER COLUMN pincode TYPE VARCHAR(20)');
    console.log('✅ Column pincode altered to VARCHAR(20)');
    
    console.log('🎉 Migration successful!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

migrateClientColumns();
