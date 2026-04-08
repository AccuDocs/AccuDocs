import 'reflect-metadata';
import { 
  ComplianceDeadline, 
  ClientDeadline, 
  Checklist, 
  ChecklistTemplate,
  Client,
  Invoice,
  InvoiceLineItem,
  InvoiceNumberSequence,
  Organization,
  ServiceTemplate,
  User
} from '../models';
import { connectDatabase, disconnectDatabase, sequelize } from '../config/database.config';
import { logger } from '../utils/logger';

async function repair() {
  try {
    await connectDatabase();
    logger.info('🚀 Starting Database Schema Repair for Compliance & Checklist Modules...');

    // Sync missing models/tables
    const syncTable = async (Model: any, name: string) => {
      try {
        await Model.sync({ alter: true });
        logger.info(`✅ Table ${name} synced successfully`);
      } catch (err: any) {
        logger.error(`❌ Table ${name} sync failed:`, err.message);
      }
    };

    await syncTable(User, 'users');
    await syncTable(Organization, 'organizations');
    await syncTable(Client, 'clients');
    await syncTable(ComplianceDeadline, 'compliance_deadlines');
    await syncTable(ClientDeadline, 'client_deadlines');
    await syncTable(ChecklistTemplate, 'checklist_templates');
    await syncTable(Checklist, 'checklists');
    await syncTable(ServiceTemplate, 'service_templates');
    await syncTable(InvoiceNumberSequence, 'invoice_number_sequences');
    await syncTable(Invoice, 'invoices');
    await syncTable(InvoiceLineItem, 'invoice_line_items');

    logger.info('🎉 Database repair complete. All core tables are now synchronized.');
  } catch (error: any) {
    logger.error('❌ Database repair failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

repair();
