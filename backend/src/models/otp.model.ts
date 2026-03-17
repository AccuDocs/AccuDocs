import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Otp extends Model {
  declare public id: string;
  declare public mobile: string;
  declare public otpHash: string;
  declare public purpose: 'login' | 'verify' | 'reset';
  declare public expiresAt: Date;
  declare public attempts: number;
  declare public isUsed: boolean;
  declare public ipAddress: string | null;
  declare public readonly createdAt: Date;
}

Otp.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mobile: { type: DataTypes.STRING(20), allowNull: false },
  otpHash: { type: DataTypes.STRING(255), allowNull: false, field: 'otp_hash' },
  purpose: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'login' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  attempts: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  isUsed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_used' },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
}, {
  sequelize,
  modelName: 'Otp',
  tableName: 'otps',
  paranoid: false, 
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});
