import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class VendorPurchaseOrderItem extends Model {
  declare public id: string;
  declare public purchaseOrderId: string;
  declare public description: string;
  declare public hsnSacCode: string | null;
  declare public quantity: number;
  declare public rate: number;
  declare public gstRate: number;
  declare public taxAmount: number;
  declare public totalAmount: number;
  declare public sortOrder: number;
}

VendorPurchaseOrderItem.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  purchaseOrderId: { type: DataTypes.UUID, allowNull: false, field: 'purchase_order_id' },
  description: { type: DataTypes.TEXT, allowNull: false },
  hsnSacCode: { type: DataTypes.STRING(20), allowNull: true, field: 'hsn_sac_code' },
  quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 1 },
  rate: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18, field: 'gst_rate' },
  taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, {
  sequelize,
  modelName: 'VendorPurchaseOrderItem',
  tableName: 'vendor_purchase_order_items',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['purchase_order_id'] }],
});
