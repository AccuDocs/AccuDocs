import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export type BulkJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export class BulkInvoiceJob extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public templateId: string | null;
  declare public clientIds: string[];
  declare public lineItemsTemplate: any[];
  declare public dueDate: Date;
  declare public period: string;
  declare public status: BulkJobStatus;
  declare public totalCount: number;
  declare public completedCount: number;
  declare public failedCount: number;
  declare public resultS3Key: string | null;
  declare public errorLog: any[];
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

BulkInvoiceJob.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  templateId: { type: DataTypes.UUID, allowNull: true, field: 'template_id' },
  clientIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'client_ids' },
  lineItemsTemplate: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'line_items_template' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  period: { type: DataTypes.STRING(20), allowNull: false },
  status: {
    type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'queued',
  },
  totalCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_count' },
  completedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'completed_count' },
  failedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'failed_count' },
  resultS3Key: { type: DataTypes.STRING(500), allowNull: true, field: 'result_s3_key' },
  errorLog: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'error_log' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'BulkInvoiceJob',
  tableName: 'bulk_invoice_jobs',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id', 'status'] },
    { fields: ['created_by'] },
  ],
});
