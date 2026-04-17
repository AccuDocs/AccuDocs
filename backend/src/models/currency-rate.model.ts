import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class CurrencyRate extends Model {
  declare public id: string;
  declare public currencyCode: string;
  declare public rateToInr: number;
  declare public fetchedAt: Date;
  declare public source: 'api' | 'manual';
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

CurrencyRate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  currencyCode: {
    type: DataTypes.STRING(3),
    allowNull: false,
    field: 'currency_code',
  },
  rateToInr: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    field: 'rate_to_inr',
  },
  fetchedAt: { type: DataTypes.DATE, allowNull: false, field: 'fetched_at' },
  source: {
    type: DataTypes.ENUM('api', 'manual'),
    allowNull: false,
    defaultValue: 'api',
  },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'CurrencyRate',
  tableName: 'currency_rates',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['currency_code'] },
    { fields: ['fetched_at'] },
  ],
});
