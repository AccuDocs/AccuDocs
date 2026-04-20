import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Warehouse extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public branchId: string | null;
  declare public name: string;
  declare public code: string;
  declare public address: string | null;
  declare public gstin: string | null;
  declare public isActive: boolean;
  declare public isDefault: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Warehouse.init({
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:     { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  branchId:  { type: DataTypes.UUID, allowNull: true,  field: 'branch_id' },
  name:      { type: DataTypes.STRING(150), allowNull: false },
  code:      { type: DataTypes.STRING(20),  allowNull: false },
  address:   { type: DataTypes.TEXT,        allowNull: true },
  gstin:     { type: DataTypes.STRING(15),  allowNull: true },
  isActive:  { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true,  field: 'is_active' },
  isDefault: { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: false, field: 'is_default' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'Warehouse',
  tableName: 'warehouses',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['org_id', 'code'] }],
});
