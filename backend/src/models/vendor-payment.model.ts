import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class VendorPayment extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public vendorId: string;
  declare public billId: string | null;
  declare public amount: number;
  declare public paymentDate: Date;
  declare public paymentMethod: 'upi' | 'bank_transfer' | 'cheque' | 'cash';
  declare public referenceNumber: string | null;
  declare public status: 'paid' | 'pending';
  declare public notes: string | null;
  declare public recordedBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

VendorPayment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
  billId: { type: DataTypes.UUID, allowNull: true, field: 'bill_id' },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'payment_date' },
  paymentMethod: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'bank_transfer', field: 'payment_method' },
  referenceNumber: { type: DataTypes.STRING(120), allowNull: true, field: 'reference_number' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'paid' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recordedBy: { type: DataTypes.UUID, allowNull: false, field: 'recorded_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'VendorPayment',
  tableName: 'vendor_payments',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id', 'vendor_id'] },
    { fields: ['bill_id'] },
    { fields: ['payment_date'] },
  ],
});
