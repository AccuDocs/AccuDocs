import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function checkColumns() {
  try {
    await connectDatabase();
    const [results]: any[] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'"
    );
    const columns = results.map((r: any) => r.column_name);
    console.log('CLIENT_COLUMNS:', JSON.stringify(columns, null, 2));
    
    // Also check if any data exists for these columns
    const [dataResults]: any[] = await sequelize.query(
      "SELECT identity_proof_url, business_registration_url, gst_status FROM clients WHERE identity_proof_url IS NOT NULL LIMIT 1"
    );
    console.log('EXISTING_DOC_DATA:', JSON.stringify(dataResults, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

checkColumns();
