import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class StockTransferItem extends Model {
  declare public id: string;
  declare public transferId: string;
  declare public itemId: string;
  declare public variantId: string | null;
  declare public batchNo: string | null;
  declare public serialNo: string | null;
  declare public qtyTransferred: number;
  declare public qtyReceived: number;
  declare public unitCost: number;
}

StockTransferItem.init({
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transferId:     { type: DataTypes.UUID, allowNull: false, field: 'transfer_id' },
  itemId:         { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantId:      { type: DataTypes.UUID, allowNull: true,  field: 'variant_id' },
  batchNo:        { type: DataTypes.STRING(100), allowNull: true, field: 'batch_no' },
  serialNo:       { type: DataTypes.STRING(100), allowNull: true, field: 'serial_no' },
  qtyTransferred: { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_transferred' },
  qtyReceived:    { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_received' },
  unitCost:       { type: DataTypes.DECIMAL(12,4), allowNull: false, defaultValue: 0, field: 'unit_cost' },
}, {
  sequelize,
  modelName: 'StockTransferItem',
  tableName: 'stock_transfer_items',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['transfer_id'] }],
});
