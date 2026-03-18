import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Subscription extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  declare public status: 'active' | 'expired' | 'cancelled' | 'past_due';
  declare public startDate: Date;
  declare public endDate: Date;
  declare public amount: number;
  declare public paymentStatus: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Subscription.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  plan: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
  paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'paid', field: 'payment_status' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'Subscription',
  tableName: 'subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
