import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class VendorPurchaseOrder extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public vendorId: string;
  declare public poNumber: string;
  declare public poDate: Date;
  declare public deliveryDate: Date | null;
  declare public status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'sent'
    | 'partially_received'
    | 'completed'
    | 'cancelled';
  declare public subtotal: number;
  declare public taxAmount: number;
  declare public totalAmount: number;
  declare public approvalNote: string | null;
  declare public notes: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

VendorPurchaseOrder.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
  poNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'po_number' },
  poDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'po_date' },
  deliveryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'delivery_date' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
  subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
  approvalNote: { type: DataTypes.TEXT, allowNull: true, field: 'approval_note' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'VendorPurchaseOrder',
  tableName: 'vendor_purchase_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['organization_id', 'po_number'] },
    { fields: ['organization_id', 'vendor_id'] },
    { fields: ['organization_id', 'status'] },
  ],
});
