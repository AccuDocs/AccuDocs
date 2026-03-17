import fs from 'fs';
import path from 'path';
import { sequelize } from '../config/database.config';
import { logger } from '../utils/logger';

const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    logger.info('🚀 Starting manual database initialization...');
    
    // Split by semicolons, but be careful with functions/triggers
    // A better way is to use a regex that handles DO blocks or just run chunks
    // PostgreSQL can actually handle multiple statements in one query call via most drivers
    
    await sequelize.authenticate();
    logger.info('✅ Connected to database');

    // Run the entire script as a single batch
    // Sequelize query() can handle multiple statements for Postgres
    await sequelize.query(sql);

    logger.info('✅ Database initialization complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initDb();
