import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class StockTransfer extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public transferNo: string;
  declare public transferDate: Date;
  declare public fromWarehouseId: string;
  declare public toWarehouseId: string;
  declare public status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  declare public notes: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  declare public readonly transferItems?: any[];
}

StockTransfer.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:            { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  transferNo:       { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'transfer_no' },
  transferDate:     { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'transfer_date' },
  fromWarehouseId:  { type: DataTypes.UUID, allowNull: false, field: 'from_warehouse_id' },
  toWarehouseId:    { type: DataTypes.UUID, allowNull: false, field: 'to_warehouse_id' },
  status:           { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  createdBy:        { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt:        { type: DataTypes.DATE, field: 'created_at' },
  updatedAt:        { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'StockTransfer',
  tableName: 'stock_transfers',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['org_id'] }],
});
