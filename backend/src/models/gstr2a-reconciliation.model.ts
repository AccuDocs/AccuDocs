import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Gstr2aReconciliation extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public period: string; // YYYY-MM
  declare public matched: any[];
  declare public mismatched: any[];
  declare public missingInBooks: any[];
  declare public missingIn2a: any[];
  declare public totalMatched: number;
  declare public totalMismatched: number;
  declare public totalMissingBooks: number;
  declare public totalMissing2a: number;
  declare public reconciledAt: Date;
  declare public createdBy: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Gstr2aReconciliation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
    clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
    period: { type: DataTypes.STRING(7), allowNull: false },
    matched: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    mismatched: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    missingInBooks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'missing_in_books' },
    missingIn2a: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'missing_in_2a' },
    totalMatched: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_matched' },
    totalMismatched: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_mismatched' },
    totalMissingBooks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_missing_books' },
    totalMissing2a: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_missing_2a' },
    reconciledAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'reconciled_at' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'Gstr2aReconciliation',
    tableName: 'gstr2a_reconciliations',
    underscored: true,
    timestamps: true,
  }
);
