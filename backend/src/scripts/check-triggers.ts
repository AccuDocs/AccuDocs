import 'reflect-metadata';
import { sequelize, connectDatabase, disconnectDatabase } from '../config/database.config';

async function checkTriggers() {
  try {
    await connectDatabase();
    const [results]: any[] = await sequelize.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table IN ('invoices', 'invoice_line_items', 'invoice_number_sequences')
    `);
    console.log('TRIGGERS:' + JSON.stringify(results));
  } catch (error) {
    console.error(error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

checkTriggers();
