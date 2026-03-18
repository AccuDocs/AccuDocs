import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class StaffPermission extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public userId: string;
  declare public resource: string;
  declare public action: string;
  declare public isAllowed: boolean;
  declare public readonly createdAt: Date;
}

StaffPermission.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  resource: { type: DataTypes.STRING(50), allowNull: false },
  action: { type: DataTypes.STRING(20), allowNull: false },
  isAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_allowed' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'StaffPermission',
  tableName: 'staff_permissions',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});
