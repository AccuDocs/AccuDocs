import 'reflect-metadata';
import '../main/container';
import { sequelize } from '../config/database.config';
import { AuditLog } from '../models/AuditLog.model';

async function fixAudit() {
  try {
    await sequelize.authenticate();
    console.log('Dropping audit_logs table...');
    await AuditLog.drop();
    console.log('Recreating audit_logs table...');
    await AuditLog.sync({ force: true });
    console.log('Successfully recreated audit_logs table!');
    process.exit(0);
  } catch (err) {
    console.error('Error recreating audit_logs:', err);
    process.exit(1);
  }
}

fixAudit();
