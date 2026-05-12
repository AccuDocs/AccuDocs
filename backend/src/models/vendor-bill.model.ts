import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class VendorBill extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public vendorId: string;
  declare public purchaseOrderId: string | null;
  declare public billNumber: string;
  declare public invoiceDate: Date;
  declare public dueDate: Date;
  declare public category: string | null;
  declare public subtotal: number;
  declare public taxAmount: number;
  declare public totalAmount: number;
  declare public amountPaid: number;
  declare public balanceDue: number;
  declare public status: 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  declare public attachmentUrl: string | null;
  declare public duplicateKey: string | null;
  declare public notes: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

VendorBill.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
  purchaseOrderId: { type: DataTypes.UUID, allowNull: true, field: 'purchase_order_id' },
  billNumber: { type: DataTypes.STRING(80), allowNull: false, field: 'bill_number' },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'invoice_date' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  category: { type: DataTypes.STRING(120), allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
  amountPaid: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'amount_paid' },
  balanceDue: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'balance_due' },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
  attachmentUrl: { type: DataTypes.STRING(600), allowNull: true, field: 'attachment_url' },
  duplicateKey: { type: DataTypes.STRING(220), allowNull: true, field: 'duplicate_key' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'VendorBill',
  tableName: 'vendor_bills',
  paranoid: true,
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['organization_id', 'vendor_id', 'bill_number'] },
    { fields: ['organization_id', 'status'] },
    { fields: ['organization_id', 'due_date'] },
    { fields: ['duplicate_key'] },
  ],
});
