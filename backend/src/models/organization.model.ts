import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Organization extends Model {
  declare public id: string;
  declare public name: string;
  declare public slug: string;
  declare public gstin: string | null;
  declare public pan: string | null;
  declare public address: string | null;
  declare public stateCode: string;
  declare public phone: string | null;
  declare public email: string | null;
  declare public logoS3Key: string | null;
  declare public bankName: string | null;
  declare public bankAccountNumber: string | null;
  declare public bankIfsc: string | null;
  declare public bankBranch: string | null;
  declare public udin: string | null;
  declare public subscriptionPlan: 'trial' | 'starter' | 'professional' | 'enterprise';
  declare public trialEndsAt: Date | null;
  declare public currentSubscriptionId: string | null;
  declare public isActive: boolean;
  declare public settings: any;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Organization.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  gstin: { type: DataTypes.STRING(15), allowNull: true },
  pan: { type: DataTypes.STRING(10), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  stateCode: { type: DataTypes.CHAR(2), allowNull: false, defaultValue: '24' },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  logoS3Key: { type: DataTypes.STRING(500), allowNull: true, field: 'logo_s3_key' },
  bankName: { type: DataTypes.STRING(150), allowNull: true, field: 'bank_name' },
  bankAccountNumber: { type: DataTypes.STRING(30), allowNull: true, field: 'bank_account_number' },
  bankIfsc: { type: DataTypes.STRING(15), allowNull: true, field: 'bank_ifsc' },
  bankBranch: { type: DataTypes.STRING(150), allowNull: true, field: 'bank_branch' },
  udin: { type: DataTypes.STRING(30), allowNull: true },
  subscriptionPlan: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'starter', field: 'subscription_plan' },
  trialEndsAt: { type: DataTypes.DATE, allowNull: true, field: 'trial_ends_at' },
  currentSubscriptionId: { type: DataTypes.UUID, allowNull: true, field: 'current_subscription_id' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  settings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Organization',
  tableName: 'organizations',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
