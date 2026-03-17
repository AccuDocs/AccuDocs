import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Payment extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public invoiceId: string;
  declare public clientId: string;
  declare public amount: number;
  declare public paymentDate: Date;
  declare public paymentMode: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'neft' | 'rtgs' | 'other';
  declare public referenceNumber: string | null;
  declare public notes: string | null;
  declare public recordedBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'payment_date' },
  paymentMode: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'bank_transfer', field: 'payment_mode' },
  referenceNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'reference_number' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recordedBy: { type: DataTypes.UUID, allowNull: false, field: 'recorded_by' },
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
