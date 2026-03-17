import { sequelize } from '../config/database.config';

async function fixDB() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Running fixes...');

    // Fix clients.credit_limit
    await sequelize.query('UPDATE clients SET credit_limit = 0 WHERE credit_limit IS NULL;');
    console.log('Fixed clients.credit_limit');

    // Fix folders.organization_id (Needs to be added first if it doesn't exist)
    await sequelize.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS organization_id UUID;');
    await sequelize.query('UPDATE folders SET organization_id = (SELECT organization_id FROM clients WHERE clients.id = folders.client_id) WHERE organization_id IS NULL;');
    console.log('Fixed folders.organization_id');

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Migration fix failed', error);
    process.exit(1);
  }
}

fixDB();
