import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ServiceTemplate extends Model {
  declare public id: string;
  declare public organizationId: string | null;
  declare public name: string;
  declare public description: string | null;
  declare public sacCode: string;
  declare public defaultRate: number;
  declare public defaultGstRate: number;
  declare public isSystem: boolean;
  declare public isActive: boolean;
  declare public sortOrder: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

ServiceTemplate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: true, field: 'organization_id' },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  sacCode: { type: DataTypes.STRING(10), allowNull: false, field: 'sac_code' },
  defaultRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, field: 'default_rate' },
  defaultGstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18.00, field: 'default_gst_rate' },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'sort_order' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'ServiceTemplate',
  tableName: 'service_templates',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
