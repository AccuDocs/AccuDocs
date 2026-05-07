import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ItemCategory extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public name: string;
  declare public code: string | null;
  declare public parentId: string | null;
  declare public level: number;
  declare public path: string | null;
  declare public sortOrder: number;
  declare public defaultHsn: string | null;
  declare public defaultGstRate: number | null;
  declare public defaultUom: string | null;
  declare public allowItems: boolean;
  declare public description: string | null;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ItemCategory.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:       { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  code:        { type: DataTypes.STRING(20), allowNull: true },
  parentId:    { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
  level:       { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 },
  path:        { type: DataTypes.STRING(500), allowNull: true },
  sortOrder:   { type: DataTypes.SMALLINT, allowNull: true, defaultValue: 0, field: 'sort_order' },
  defaultHsn:  { type: DataTypes.STRING(20), allowNull: true, field: 'default_hsn' },
  defaultGstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'default_gst_rate' },
  defaultUom:  { type: DataTypes.STRING(30), allowNull: true, field: 'default_uom' },
  allowItems:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'allow_items' },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  createdAt:   { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:   { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'ItemCategory',
  tableName: 'item_categories',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['org_id'] },
    { fields: ['parent_id'] },
    { unique: true, fields: ['org_id', 'code'] },
  ],
});
