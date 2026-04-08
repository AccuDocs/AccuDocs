import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function verifyClientSchema() {
  try {
    await connectDatabase();
    const [results]: any[] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY column_name
    `);
    console.log('VERIFY_COLUMNS:' + JSON.stringify(results));
  } catch (error) {
    console.error(error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

verifyClientSchema();
