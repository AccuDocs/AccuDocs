import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ItemCategory extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public name: string;
  declare public parentId: string | null;
  declare public description: string | null;
  declare public isActive: boolean;
}

ItemCategory.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:       { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  parentId:    { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
}, {
  sequelize,
  modelName: 'ItemCategory',
  tableName: 'item_categories',
  underscored: true,
  timestamps: false,
});
