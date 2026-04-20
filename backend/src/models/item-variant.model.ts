import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ItemVariant extends Model {
  declare public id: string;
  declare public itemId: string;
  declare public variantName: string;
  declare public skuSuffix: string | null;
  declare public barcode: string | null;
  declare public additionalPrice: number;
  declare public attributes: Record<string, any>;
  declare public isActive: boolean;
}

ItemVariant.init({
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  itemId:          { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantName:     { type: DataTypes.STRING(100), allowNull: false, field: 'variant_name' },
  skuSuffix:       { type: DataTypes.STRING(50), allowNull: true,  field: 'sku_suffix' },
  barcode:         { type: DataTypes.STRING(100), allowNull: true },
  additionalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, field: 'additional_price' },
  attributes:      { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  isActive:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
}, {
  sequelize,
  modelName: 'ItemVariant',
  tableName: 'item_variants',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['item_id'] }],
});
