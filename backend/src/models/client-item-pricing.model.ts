import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientItemPricing extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public itemId: string;
  declare public variantId: string | null;
  declare public customSellingPrice: number;
  declare public discountPct: number;
  declare public validFrom: string | null;
  declare public validTo: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ClientItemPricing.init({
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId:           { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  itemId:             { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantId:          { type: DataTypes.UUID, allowNull: true,  field: 'variant_id' },
  customSellingPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, field: 'custom_selling_price' },
  discountPct:        { type: DataTypes.DECIMAL(5,2),  allowNull: false, defaultValue: 0, field: 'discount_pct' },
  validFrom:          { type: DataTypes.DATEONLY, allowNull: true, field: 'valid_from' },
  validTo:            { type: DataTypes.DATEONLY, allowNull: true, field: 'valid_to' },
  createdAt:          { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:          { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'ClientItemPricing',
  tableName: 'client_item_pricing',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['client_id'] },
    { fields: ['item_id'] },
    { unique: true, fields: ['client_id', 'item_id', 'variant_id'] },
  ],
});
