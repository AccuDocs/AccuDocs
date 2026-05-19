import { sequelize } from '../../../config/database.config';
import { logger } from '../../../utils/logger';

export const ensureTaskSchema = async (): Promise<void> => {
  const statements = [
    `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS module_type VARCHAR(50)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS module_id VARCHAR(100)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8, 2)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8, 2)`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_org_status_due ON tasks (organization_id, status, due_date)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to)`,
    `CREATE TABLE IF NOT EXISTS task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS task_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255),
      uploaded_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS task_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL,
      action VARCHAR(50) NOT NULL,
      old_value JSONB,
      new_value JSONB,
      user_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task ON task_activity_logs (task_id, created_at DESC)`,
  ];

  for (const statement of statements) {
    await sequelize.query(statement);
  }

  logger.info('Task schema verified');
};
