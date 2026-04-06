import 'reflect-metadata';
import { ComplianceDeadline, ClientDeadline, Checklist, ChecklistTemplate } from '../models';
import { connectDatabase, disconnectDatabase, sequelize } from '../config/database.config';
import { logger } from '../utils/logger';

async function repair() {
  try {
    await connectDatabase();
    logger.info('🚀 Starting Database Schema Repair for Compliance & Checklist Modules...');

    // Sync missing models/tables
    await ComplianceDeadline.sync({ alter: true });
    logger.info('✅ Table compliance_deadlines synced successfully');

    await ClientDeadline.sync({ alter: true });
    logger.info('✅ Table client_deadlines synced successfully');

    await ChecklistTemplate.sync({ alter: true });
    logger.info('✅ Table checklist_templates synced successfully');

    await Checklist.sync({ alter: true });
    logger.info('✅ Table checklists synced successfully');

    logger.info('🎉 Database repair complete. All requested tables are now active.');
  } catch (error: any) {
    logger.error('❌ Database repair failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

repair();
