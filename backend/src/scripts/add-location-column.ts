import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function addLocationColumn() {
  try {
    await connectDatabase();
    console.log('🚀 Altering table clients...');
    await sequelize.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL');
    console.log('✅ Column location added successfully');
  } catch (error) {
    console.error('❌ Failed to add column:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

addLocationColumn();
