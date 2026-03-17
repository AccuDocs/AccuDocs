import { sequelize } from '../config/database.config';

async function fixUsers() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Adding avatar_s3_key column to users...');

    await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_s3_key VARCHAR(500);');
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Migration fix failed', error);
    process.exit(1);
  }
}

fixUsers();
