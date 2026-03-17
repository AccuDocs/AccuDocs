import 'reflect-metadata';
import '../main/container';
import { sequelize } from '../config/database.config';
import { Invoice } from '../models/invoice.model';
import { InvoiceLineItem } from '../models/InvoiceLineItem.model';

async function fixInvoiceTable() {
  try {
    await sequelize.authenticate();
    console.log('Dropping invoice_line_items and invoices tables...');
    await sequelize.query('DROP TABLE IF EXISTS "invoice_line_items" CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS "invoices" CASCADE');
    
    console.log('Recreating invoices table...');
    await Invoice.sync({ force: true });
    
    console.log('Recreating invoice_line_items table...');
    await InvoiceLineItem.sync({ force: true });
    
    console.log('Successfully recreated invoice tables!');
    process.exit(0);
  } catch (err) {
    console.error('Error recreating tables:', err);
    process.exit(1);
  }
}

fixInvoiceTable();
