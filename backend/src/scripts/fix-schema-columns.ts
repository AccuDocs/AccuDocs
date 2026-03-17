import { sequelize } from '../config/database.config';
import { QueryTypes } from 'sequelize';

async function fixSchema() {
  try {
    console.log('Checking columns for documents...');
    const docCols = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents'",
      { type: QueryTypes.SELECT }
    ) as any[];
    const docColNames = docCols.map(c => c.column_name);
    console.log('Document columns:', docColNames);

    if (!docColNames.includes('organization_id') && docColNames.includes('organizationId')) {
       console.log('Renaming organizationId to organization_id in documents');
       await sequelize.query('ALTER TABLE documents RENAME COLUMN "organizationId" TO organization_id');
    }

    console.log('Checking columns for tasks...');
    const taskCols = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'",
      { type: QueryTypes.SELECT }
    ) as any[];
    const taskColNames = taskCols.map(c => c.column_name);
    console.log('Task columns:', taskColNames);

    if (!taskColNames.includes('organization_id') && taskColNames.includes('organizationId')) {
       console.log('Renaming organizationId to organization_id in tasks');
       await sequelize.query('ALTER TABLE tasks RENAME COLUMN "organizationId" TO organization_id');
    }

    console.log('Checking columns for audit_logs...');
    const auditCols = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'",
      { type: QueryTypes.SELECT }
    ) as any[];
    const auditColNames = auditCols.map(c => c.column_name);
    console.log('AuditLog columns:', auditColNames);

    if (!auditColNames.includes('created_at') && auditColNames.includes('createdAt')) {
       console.log('Renaming createdAt to created_at in audit_logs');
       await sequelize.query('ALTER TABLE audit_logs RENAME COLUMN "createdAt" TO created_at');
    }
    
    // Add missing organization_id to documents if it doesn't exist in any form 
    // Usually it exists as camelCase if the auto-sync did something weird.
    
    console.log('Schema check complete');
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix schema:', err);
    process.exit(1);
  }
}

fixSchema();
