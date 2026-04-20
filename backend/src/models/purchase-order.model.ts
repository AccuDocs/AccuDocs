import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class PurchaseOrder extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public branchId: string | null;
  declare public supplierClientId: string;
  declare public poNumber: string;
  declare public poDate: Date;
  declare public expectedDeliveryDate: Date | null;
  declare public warehouseId: string;
  declare public status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  declare public subtotal: number;
  declare public gstAmount: number;
  declare public total: number;
  declare public notes: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  declare public readonly items?: any[];
}

PurchaseOrder.init({
  id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:                { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  branchId:             { type: DataTypes.UUID, allowNull: true,  field: 'branch_id' },
  supplierClientId:     { type: DataTypes.UUID, allowNull: false, field: 'supplier_client_id' },
  poNumber:             { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'po_number' },
  poDate:               { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'po_date' },
  expectedDeliveryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expected_delivery_date' },
  warehouseId:          { type: DataTypes.UUID, allowNull: false, field: 'warehouse_id' },
  status:               { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  subtotal:             { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  gstAmount:            { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, field: 'gst_amount' },
  total:                { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  notes:                { type: DataTypes.TEXT, allowNull: true },
  createdBy:            { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt:            { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:            { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'PurchaseOrder',
  tableName: 'purchase_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['org_id'] },
    { fields: ['supplier_client_id'] },
    { fields: ['status'] },
  ],
});
