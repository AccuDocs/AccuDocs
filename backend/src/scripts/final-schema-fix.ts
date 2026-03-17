import { sequelize } from '../config/database.config';

async function finalSchemaFix() {
  try {
    console.log('Fixing documents table...');
    await sequelize.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID');
    await sequelize.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_id UUID');
    await sequelize.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID');
    await sequelize.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID');

    // Rename columns if they exist as the other names
    const checkSize = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'size'");
    if (checkSize[0].length > 0) await sequelize.query('ALTER TABLE documents RENAME COLUMN size TO size_bytes');

    const checkPath = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 's3_path'");
    if (checkPath[0].length > 0) await sequelize.query('ALTER TABLE documents RENAME COLUMN s3_path TO s3_key');

    const checkVer = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'current_version'");
    if (checkVer[0].length > 0) await sequelize.query('ALTER TABLE documents RENAME COLUMN current_version TO version');

    console.log('Fixing tasks table...');
    await sequelize.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID');
    
    console.log('Fixing audit_logs table...');
    // Ensure audit_logs has the expected columns
    await sequelize.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID');

    console.log('Final schema fix complete');
    process.exit(0);
  } catch (err) {
    console.error('Final schema fix failed:', err);
    process.exit(1);
  }
}

finalSchemaFix();
