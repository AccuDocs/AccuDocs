import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ItcLedger extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public period: string; // YYYY-MM
  declare public igstClaimed: number;
  declare public cgstClaimed: number;
  declare public sgstClaimed: number;
  declare public eligibleItc: number;
  declare public ineligibleItc: number;
  declare public reversedItc: number;
  declare public source: 'GSTR2A' | 'manual';
  declare public status: string;
  declare public notes: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ItcLedger.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
    clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
    period: { type: DataTypes.STRING(7), allowNull: false },
    igstClaimed: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'igst_claimed' },
    cgstClaimed: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'cgst_claimed' },
    sgstClaimed: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'sgst_claimed' },
    eligibleItc: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'eligible_itc' },
    ineligibleItc: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'ineligible_itc' },
    reversedItc: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'reversed_itc' },
    source: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'manual' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'calculated' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'ItcLedger',
    tableName: 'itc_ledger',
    underscored: true,
    timestamps: true,
  }
);
