import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class AuditLog extends Model {
  declare public id: string;
  declare public organizationId: string | null;
  declare public userId: string | null;
  declare public action: string;
  declare public entityType: string;
  declare public entityId: string | null;
  declare public description: string;
  declare public oldValues: any;
  declare public newValues: any;
  declare public ipAddress: string | null;
  declare public userAgent: string | null;
  declare public requestId: string | null;
  declare public readonly createdAt: Date;
}

// Ensure the table matches 'audit_logs' without soft deletes
AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: true, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
  action: { type: DataTypes.STRING(80), allowNull: false },
  entityType: { type: DataTypes.STRING(50), allowNull: false, field: 'entity_type' },
  entityId: { type: DataTypes.UUID, allowNull: true, field: 'entity_id' },
  description: { type: DataTypes.TEXT, allowNull: false },
  oldValues: { type: DataTypes.JSONB, allowNull: true, field: 'old_values' },
  newValues: { type: DataTypes.JSONB, allowNull: true, field: 'new_values' },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
  userAgent: { type: DataTypes.STRING(500), allowNull: true, field: 'user_agent' },
  requestId: { type: DataTypes.STRING(50), allowNull: true, field: 'request_id' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  paranoid: false, 
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});
