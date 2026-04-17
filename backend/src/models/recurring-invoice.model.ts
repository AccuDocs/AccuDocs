import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed';

export class RecurringInvoice extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public baseInvoiceId: string;
  declare public frequency: RecurringFrequency;
  declare public nextRunDate: Date;
  declare public endDate: Date | null;
  declare public autoSend: boolean;
  declare public lastGeneratedInvoiceId: string | null;
  declare public status: RecurringStatus;
  declare public totalGenerated: number;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

RecurringInvoice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  baseInvoiceId: { type: DataTypes.UUID, allowNull: false, field: 'base_invoice_id' },
  frequency: {
    type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly',
  },
  nextRunDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'next_run_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  autoSend: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'auto_send' },
  lastGeneratedInvoiceId: { type: DataTypes.UUID, allowNull: true, field: 'last_generated_invoice_id' },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed'),
    allowNull: false,
    defaultValue: 'active',
  },
  totalGenerated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_generated' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'RecurringInvoice',
  tableName: 'recurring_invoices',
  underscored: true,
  paranoid: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id', 'status', 'next_run_date'] },
    { fields: ['base_invoice_id'] },
  ],
});
