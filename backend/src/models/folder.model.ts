import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Folder extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public yearId: string | null;
  declare public parentFolderId: string | null;
  declare public name: string;
  declare public slug: string;
  declare public category: 'gst' | 'income_tax' | 'audit' | 'tds' | 'roc' | 'personal' | 'other' | null;
  declare public isSystem: boolean;
  declare public sortOrder: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Folder.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  yearId: { type: DataTypes.UUID, allowNull: true, field: 'year_id' },
  parentFolderId: { type: DataTypes.UUID, allowNull: true, field: 'parent_folder_id' },
  name: { type: DataTypes.STRING(150), allowNull: false },
  slug: { type: DataTypes.STRING(150), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: true },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
  sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, {
  sequelize,
  modelName: 'Folder',
  tableName: 'folders',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
