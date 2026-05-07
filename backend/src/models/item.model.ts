import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Item extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public name: string;
  declare public sku: string | null;
  declare public barcode: string | null;
  declare public hsnSacCode: string | null;
  declare public itemType: 'goods' | 'service';
  declare public unitOfMeasure: string;
  declare public purchasePrice: number;
  declare public sellingPrice: number;
  declare public mrp: number | null;
  declare public gstRate: number;
  declare public cessRate: number;
  declare public trackInventory: boolean;
  declare public allowNegativeStock: boolean;
  declare public reorderPoint: number | null;
  declare public reorderQty: number | null;
  declare public categoryId: string | null;
  declare public isActive: boolean;
  declare public description: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // associations
  declare public readonly variants?: any[];
}

Item.init({
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:              { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  name:               { type: DataTypes.STRING(200), allowNull: false },
  sku:                { type: DataTypes.STRING(100), allowNull: true },
  barcode:            { type: DataTypes.STRING(100), allowNull: true },
  hsnSacCode:         { type: DataTypes.STRING(20),  allowNull: true, field: 'hsn_sac_code' },
  itemType:           { type: DataTypes.STRING(10),  allowNull: false, defaultValue: 'goods', field: 'item_type' },
  unitOfMeasure:      { type: DataTypes.STRING(30),  allowNull: false, defaultValue: 'PCS', field: 'unit_of_measure' },
  purchasePrice:      { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, field: 'purchase_price' },
  sellingPrice:       { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, field: 'selling_price' },
  mrp:                { type: DataTypes.DECIMAL(12,2), allowNull: true },
  gstRate:            { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 18, field: 'gst_rate' },
  cessRate:           { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0,  field: 'cess_rate' },
  trackInventory:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,  field: 'track_inventory' },
  allowNegativeStock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'allow_negative_stock' },
  reorderPoint:       { type: DataTypes.INTEGER,  allowNull: true, field: 'reorder_point' },
  reorderQty:         { type: DataTypes.INTEGER,  allowNull: true, field: 'reorder_qty' },
  categoryId:         { type: DataTypes.UUID, allowNull: true, field: 'category_id' },
  isActive:           { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  description:        { type: DataTypes.TEXT, allowNull: true },
  createdAt:          { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:          { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'Item',
  tableName: 'items',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['org_id'] },
    { unique: true, fields: ['org_id', 'sku'] },
    { fields: ['barcode'] },
    { fields: ['category_id'] },
  ],
});
