import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class User extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public name: string;
  declare public mobile: string;
  declare public email: string | null;
  declare public password: string | null;
  declare public role: 'super_admin' | 'admin' | 'staff' | 'client';
  declare public isActive: boolean;
  declare public avatarS3Key: string | null;
  declare public lastLoginAt: Date | null;
  declare public preferences: any;
  declare public mfaSecret: string | null;
  declare public otpAttempts: number;
  declare public lockedUntil: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  mobile: { type: DataTypes.STRING(20), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: true },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'client' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  avatarS3Key: { type: DataTypes.STRING(500), allowNull: true, field: 'avatar_s3_key' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
  preferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  mfaSecret: { type: DataTypes.STRING(100), allowNull: true, field: 'mfa_secret' },
  otpAttempts: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'otp_attempts' },
  lockedUntil: { type: DataTypes.DATE, allowNull: true, field: 'locked_until' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['organization_id', 'mobile'] }
  ]
});
