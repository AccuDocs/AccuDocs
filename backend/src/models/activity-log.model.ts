import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ActivityLog extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public userId: string | null;
  declare public action: string;
  declare public entityType: string | null;
  declare public entityId: string | null;
  declare public details: any;
  declare public ipAddress: string | null;
  declare public readonly createdAt: Date;
}

ActivityLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
  action: { type: DataTypes.STRING(50), allowNull: false },
  entityType: { type: DataTypes.STRING(30), allowNull: true, field: 'entity_type' },
  entityId: { type: DataTypes.UUID, allowNull: true, field: 'entity_id' },
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'ActivityLog',
  tableName: 'activity_log',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});
