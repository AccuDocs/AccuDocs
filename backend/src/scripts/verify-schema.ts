import 'reflect-metadata';
import { ComplianceDeadline, ClientDeadline } from '../models';
import { connectDatabase, disconnectDatabase, sequelize } from '../config/database.config';
import { logger } from '../utils/logger';

async function verify() {
  try {
    await connectDatabase();
    logger.info('🔍 Verifying Compliance Tables...');

    const table1 = await sequelize.getQueryInterface().showAllTables();
    if (table1.includes('compliance_deadlines')) {
      logger.info('✅ Table compliance_deadlines exists');
    } else {
      logger.error('❌ Table compliance_deadlines is MISSING');
    }

    if (table1.includes('client_deadlines')) {
      logger.info('✅ Table client_deadlines exists');
    } else {
      logger.error('❌ Table client_deadlines is MISSING');
    }

    // Try a simple count query
    const count = await ComplianceDeadline.count();
    logger.info(`📊 ComplianceDeadline count: ${count}`);

  } catch (error: any) {
    logger.error('❌ Verification failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

verify();
