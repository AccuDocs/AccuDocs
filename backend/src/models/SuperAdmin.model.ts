import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class SuperAdmin extends Model {
  declare public id: string;
  declare public name: string;
  declare public email: string;
  declare public passwordHash: string;
  declare public isActive: boolean;
  declare public lastLoginAt: Date | null;
  declare public lastLoginIp: string | null;
  declare public mfaSecret: string | null;
  declare public mfaEnabled: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

SuperAdmin.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
  lastLoginIp: { type: DataTypes.STRING(45), allowNull: true, field: 'last_login_ip' },
  mfaSecret: { type: DataTypes.STRING(100), allowNull: true, field: 'mfa_secret' },
  mfaEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'mfa_enabled' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'SuperAdmin',
  tableName: 'super_admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false
});

export default SuperAdmin;
