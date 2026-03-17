import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Notification extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public userId: string | null;
  declare public type: string;
  declare public title: string;
  declare public message: string;
  declare public channel: 'in_app' | 'whatsapp' | 'email' | 'sms';
  declare public isRead: boolean;
  declare public readAt: Date | null;
  declare public metadata: any;
  declare public sentAt: Date | null;
  declare public deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  declare public errorMessage: string | null;
  declare public readonly createdAt: Date;
}

Notification.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  channel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_app' },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  deliveryStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'delivery_status' },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  paranoid: false, 
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});
