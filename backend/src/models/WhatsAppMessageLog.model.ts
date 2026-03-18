import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class WhatsAppMessageLog extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public userId: string | null;
  declare public whatsappSid: string | null;
  declare public phoneNumber: string;
  declare public messageText: string;
  declare public status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  declare public errorMessage: string | null;
  declare public sentAt: Date | null;
  declare public deliveredAt: Date | null;
  declare public readAt: Date | null;
  declare public metadata: any;
  declare public readonly createdAt: Date;
}

WhatsAppMessageLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  userId: { type: DataTypes.UUID, allowNull: true, field: 'user_id' },
  whatsappSid: { type: DataTypes.STRING(100), allowNull: true, field: 'whatsapp_sid' },
  phoneNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'phone_number' },
  messageText: { type: DataTypes.TEXT, allowNull: false, field: 'message_text' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'WhatsAppMessageLog',
  tableName: 'whatsapp_message_logs',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});
