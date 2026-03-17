import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Client extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public userId: string;
  declare public code: string;
  declare public name: string;
  declare public gstin: string | null;
  declare public pan: string | null;
  declare public mobile: string | null;
  declare public email: string | null;
  declare public address: string | null;
  declare public stateCode: string;
  declare public city: string | null;
  declare public pincode: string | null;
  declare public creditLimit: number;
  declare public entityType: 'individual' | 'proprietorship' | 'partnership' | 'pvt_ltd' | 'llp' | 'trust' | 'huf' | 'other';
  declare public notes: string | null;
  declare public metadata: any;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Client.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  code: { type: DataTypes.STRING(10), allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  gstin: { type: DataTypes.STRING(15), allowNull: true },
  pan: { type: DataTypes.STRING(10), allowNull: true },
  mobile: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  stateCode: { type: DataTypes.CHAR(2), allowNull: false, defaultValue: '24', field: 'state_code' },
  city: { type: DataTypes.STRING(100), allowNull: true },
  pincode: { type: DataTypes.STRING(10), allowNull: true },
  creditLimit: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'credit_limit' },
  entityType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'individual', field: 'entity_type' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Client',
  tableName: 'clients',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['organization_id', 'code'] }
  ]
});
