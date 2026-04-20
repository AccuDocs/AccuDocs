import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class StockSummary extends Model {
  declare public id: string;
  declare public warehouseId: string;
  declare public itemId: string;
  declare public variantId: string | null;
  declare public batchNo: string | null;
  declare public qtyOnHand: number;
  declare public qtyReserved: number;
  declare public avgCost: number;
  declare public lastPurchaseRate: number;
  declare public lastUpdated: Date;
}

StockSummary.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  warehouseId:      { type: DataTypes.UUID, allowNull: false, field: 'warehouse_id' },
  itemId:           { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantId:        { type: DataTypes.UUID, allowNull: true,  field: 'variant_id' },
  batchNo:          { type: DataTypes.STRING(100), allowNull: true, field: 'batch_no' },
  qtyOnHand:        { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_on_hand' },
  qtyReserved:      { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_reserved' },
  avgCost:          { type: DataTypes.DECIMAL(12,4), allowNull: false, defaultValue: 0, field: 'avg_cost' },
  lastPurchaseRate: { type: DataTypes.DECIMAL(12,4), allowNull: false, defaultValue: 0, field: 'last_purchase_rate' },
  lastUpdated:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'last_updated' },
}, {
  sequelize,
  modelName: 'StockSummary',
  tableName: 'stock_summary',
  underscored: true,
  timestamps: false,
  indexes: [
    { fields: ['warehouse_id'] },
    { fields: ['item_id'] },
    { unique: true, fields: ['warehouse_id', 'item_id', 'variant_id', 'batch_no'] },
  ],
});
