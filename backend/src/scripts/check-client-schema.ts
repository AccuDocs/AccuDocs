import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function checkClientSchema() {
  try {
    await connectDatabase();
    const [results]: any[] = await sequelize.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    console.log('CLIENT_COLUMNS:' + JSON.stringify(results));
  } catch (error) {
    console.error(error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

checkClientSchema();
