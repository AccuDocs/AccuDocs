import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class RecurringInvoiceTemplate extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public name: string;
  declare public frequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  declare public nextRunDate: Date;
  declare public advanceNoticeDays: number;
  declare public isActive: boolean;
  declare public autoIssue: boolean;
  declare public lineItemsSnapshot: any;
  declare public defaultNotes: string | null;
  declare public defaultDueDays: number;
  declare public totalGenerated: number;
  declare public lastGeneratedAt: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

RecurringInvoiceTemplate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  name: { type: DataTypes.STRING(150), allowNull: false },
  frequency: { type: DataTypes.STRING(20), allowNull: false },
  nextRunDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'next_run_date' },
  advanceNoticeDays: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 5, field: 'advance_notice_days' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  autoIssue: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'auto_issue' },
  lineItemsSnapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'line_items_snapshot' },
  defaultNotes: { type: DataTypes.TEXT, allowNull: true, field: 'default_notes' },
  defaultDueDays: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 30, field: 'default_due_days' },
  totalGenerated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_generated' },
  lastGeneratedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_generated_at' },
}, {
  sequelize,
  modelName: 'RecurringInvoiceTemplate',
  tableName: 'recurring_invoice_templates',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
