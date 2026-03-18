import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientAccessToken extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public tokenHash: string;
  declare public expiresAt: Date;
  declare public lastUsedAt: Date | null;
  declare public readonly createdAt: Date;
}

ClientAccessToken.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  tokenHash: { type: DataTypes.STRING(255), allowNull: false, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  lastUsedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_used_at' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'ClientAccessToken',
  tableName: 'client_access_tokens',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});
