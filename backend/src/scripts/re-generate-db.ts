import { sequelize } from '../config/database.config';
import * as Models from '../models';

async function reGenerateDB() {
  try {
    console.log('--- Database Regeneration Starting ---');
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established.');

    console.log('CAUTION: Dropping and recreating all tables...');
    // force: true will drop tables if they exist
    // This uses the models imported from ../models/index.ts
    await sequelize.sync({ force: true });
    
    console.log('--- Database Regeneration Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database regeneration failed:', error);
    process.exit(1);
  }
}

reGenerateDB();
