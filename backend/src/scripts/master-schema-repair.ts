import { sequelize } from '../config/database.config';

async function ultimateRepair() {
  try {
    // 1. Organizations table
    console.log('Repairing organizations table...');
    const orgFixes = [
      'logo_s3_key VARCHAR(500)',
      'bank_name VARCHAR(150)',
      'bank_account_number VARCHAR(30)',
      'bank_ifsc VARCHAR(15)',
      'bank_branch VARCHAR(150)',
      'udin VARCHAR(30)',
      'subscription_plan VARCHAR(20) DEFAULT \'starter\'',
      'is_active BOOLEAN DEFAULT TRUE',
      'settings JSONB DEFAULT \'{}\'',
      'created_at TIMESTAMPTZ DEFAULT NOW()',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'deleted_at TIMESTAMPTZ'
    ];
    for (const fix of orgFixes) {
      await sequelize.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ${fix}`).catch(() => {});
    }

    // 2. Users table
    console.log('Repairing users table...');
    const userFixes = [
      'avatar_s3_key VARCHAR(500)',
      'last_login_at TIMESTAMPTZ',
      'preferences JSONB DEFAULT \'{}\'',
      'role VARCHAR(20) DEFAULT \'client\'',
      'is_active BOOLEAN DEFAULT TRUE',
      'created_at TIMESTAMPTZ DEFAULT NOW()',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'deleted_at TIMESTAMPTZ'
    ];
    for (const fix of userFixes) {
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${fix}`).catch(() => {});
    }

    // 3. Clients table
    console.log('Repairing clients table...');
    const clientFixes = [
      'state_code CHAR(2) DEFAULT \'24\'',
      'credit_limit DECIMAL(12, 2) DEFAULT 0',
      'entity_type VARCHAR(20) DEFAULT \'individual\'',
      'is_active BOOLEAN DEFAULT TRUE',
      'created_at TIMESTAMPTZ DEFAULT NOW()',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'deleted_at TIMESTAMPTZ'
    ];
    for (const fix of clientFixes) {
      await sequelize.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${fix}`).catch(() => {});
    }

    // 4. Documents table
    console.log('Repairing documents table...');
    const docFixes = [
      'organization_id UUID',
      'client_id UUID',
      'year_id UUID',
      'folder_id UUID',
      'uploaded_by UUID',
      'parent_document_id UUID',
      'mime_type VARCHAR(100)',
      'size_bytes BIGINT',
      's3_key VARCHAR(500)',
      'version INTEGER DEFAULT 1',
      'is_shared_with_client BOOLEAN DEFAULT FALSE',
      'shared_at TIMESTAMPTZ',
      'whatsapp_sent_at TIMESTAMPTZ',
      'whatsapp_sent_by UUID',
      'download_count INTEGER DEFAULT 0',
      'last_accessed_at TIMESTAMPTZ',
      'created_at TIMESTAMPTZ DEFAULT NOW()',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'deleted_at TIMESTAMPTZ'
    ];
    for (const fix of docFixes) {
      await sequelize.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS ${fix}`).catch(() => {});
    }
    // Renames
    await sequelize.query('ALTER TABLE documents RENAME COLUMN size TO size_bytes').catch(() => {});
    await sequelize.query('ALTER TABLE documents RENAME COLUMN s3_path TO s3_key').catch(() => {});
    await sequelize.query('ALTER TABLE documents RENAME COLUMN current_version TO version').catch(() => {});

    // 5. Tasks table
    console.log('Repairing tasks table...');
    const taskFixes = [
      'organization_id UUID',
      'related_invoice_id UUID',
      'related_document_id UUID',
      'due_date TIMESTAMPTZ',
      'completed_at TIMESTAMPTZ',
      'created_at TIMESTAMPTZ DEFAULT NOW()',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'deleted_at TIMESTAMPTZ'
    ];
    for (const fix of taskFixes) {
      await sequelize.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ${fix}`).catch(() => {});
    }

    // 6. Audit Logs
    console.log('Repairing audit_logs table...');
    await sequelize.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()').catch(() => {});

    console.log('Ultimate schema repair complete');
    process.exit(0);
  } catch (err) {
    console.error('Ultimate schema repair failed:', err);
    process.exit(1);
  }
}

ultimateRepair();
