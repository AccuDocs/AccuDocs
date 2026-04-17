import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export type TdsStatus = 'pending' | 'deducted' | 'deposited' | 'filed';

export class TdsEntry extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public deductor: string;
  declare public pan: string;
  declare public section: string;
  declare public paymentNature: string;
  declare public amount: number;
  declare public tdsRate: number;
  declare public tdsAmount: number;
  declare public period: string;
  declare public challanNo: string | null;
  declare public status: TdsStatus;
  declare public deductionDate: Date | null;
  declare public depositDate: Date | null;
  declare public remarks: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

TdsEntry.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  deductor: { type: DataTypes.STRING(200), allowNull: false },
  pan: { type: DataTypes.STRING(10), allowNull: false },
  section: { type: DataTypes.STRING(10), allowNull: false },
  paymentNature: { type: DataTypes.STRING(200), allowNull: false, field: 'payment_nature' },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  tdsRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'tds_rate' },
  tdsAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'tds_amount' },
  period: { type: DataTypes.STRING(10), allowNull: false }, // e.g. "2024-25 Q1"
  challanNo: { type: DataTypes.STRING(20), allowNull: true, field: 'challan_no' },
  status: {
    type: DataTypes.ENUM('pending', 'deducted', 'deposited', 'filed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  deductionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'deduction_date' },
  depositDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'deposit_date' },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'TdsEntry',
  tableName: 'tds_entries',
  underscored: true,
  paranoid: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id', 'client_id'] },
    { fields: ['period'] },
    { fields: ['section'] },
  ],
});
