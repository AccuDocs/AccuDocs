import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class PurchaseOrderItem extends Model {
  declare public id: string;
  declare public poId: string;
  declare public itemId: string;
  declare public variantId: string | null;
  declare public hsnSacCode: string | null;
  declare public qtyOrdered: number;
  declare public qtyReceived: number;
  declare public unitPrice: number;
  declare public gstRate: number;
  declare public gstAmount: number;
  declare public total: number;
  declare public batchNo: string | null;
  declare public expectedDate: Date | null;
}

PurchaseOrderItem.init({
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  poId:         { type: DataTypes.UUID, allowNull: false, field: 'po_id' },
  itemId:       { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantId:    { type: DataTypes.UUID, allowNull: true,  field: 'variant_id' },
  hsnSacCode:   { type: DataTypes.STRING(20),   allowNull: true,  field: 'hsn_sac_code' },
  qtyOrdered:   { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_ordered' },
  qtyReceived:  { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_received' },
  unitPrice:    { type: DataTypes.DECIMAL(12,4), allowNull: false, defaultValue: 0, field: 'unit_price' },
  gstRate:      { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 18, field: 'gst_rate' },
  gstAmount:    { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, field: 'gst_amount' },
  total:        { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  batchNo:      { type: DataTypes.STRING(100), allowNull: true, field: 'batch_no' },
  expectedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expected_date' },
}, {
  sequelize,
  modelName: 'PurchaseOrderItem',
  tableName: 'purchase_order_items',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['po_id'] }, { fields: ['item_id'] }],
});
