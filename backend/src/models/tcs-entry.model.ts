import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class TcsEntry extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public sellerGstin: string;
  declare public buyerGstin: string;
  declare public transactionValue: number;
  declare public tcsRate: number;
  declare public tcsAmount: number;
  declare public period: string;
  declare public collectionDate: Date | null;
  declare public remarks: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

TcsEntry.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  sellerGstin: { type: DataTypes.STRING(15), allowNull: false, field: 'seller_gstin' },
  buyerGstin: { type: DataTypes.STRING(15), allowNull: false, field: 'buyer_gstin' },
  transactionValue: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'transaction_value' },
  tcsRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'tcs_rate' },
  tcsAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'tcs_amount' },
  period: { type: DataTypes.STRING(10), allowNull: false },
  collectionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'collection_date' },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'TcsEntry',
  tableName: 'tcs_entries',
  underscored: true,
  paranoid: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['period'] },
    { fields: ['seller_gstin', 'buyer_gstin'] },
  ],
});
