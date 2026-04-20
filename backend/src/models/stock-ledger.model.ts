import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class StockLedger extends Model {
  declare public id: string;
  declare public orgId: string;
  declare public warehouseId: string;
  declare public itemId: string;
  declare public variantId: string | null;
  declare public transactionType: string;
  declare public referenceType: string | null;
  declare public referenceId: string | null;
  declare public clientId: string | null;
  declare public batchNo: string | null;
  declare public serialNo: string | null;
  declare public qtyIn: number;
  declare public qtyOut: number;
  declare public rate: number;
  declare public valuationMethod: string;
  declare public runningBalance: number;
  declare public transactionDate: Date;
  declare public notes: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
}

StockLedger.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orgId:            { type: DataTypes.UUID, allowNull: false, field: 'org_id' },
  warehouseId:      { type: DataTypes.UUID, allowNull: false, field: 'warehouse_id' },
  itemId:           { type: DataTypes.UUID, allowNull: false, field: 'item_id' },
  variantId:        { type: DataTypes.UUID, allowNull: true,  field: 'variant_id' },
  transactionType:  { type: DataTypes.STRING(30), allowNull: false, field: 'transaction_type' },
  referenceType:    { type: DataTypes.STRING(30), allowNull: true,  field: 'reference_type' },
  referenceId:      { type: DataTypes.UUID, allowNull: true,  field: 'reference_id' },
  clientId:         { type: DataTypes.UUID, allowNull: true,  field: 'client_id' },
  batchNo:          { type: DataTypes.STRING(100), allowNull: true, field: 'batch_no' },
  serialNo:         { type: DataTypes.STRING(100), allowNull: true, field: 'serial_no' },
  qtyIn:            { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_in' },
  qtyOut:           { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'qty_out' },
  rate:             { type: DataTypes.DECIMAL(12,4), allowNull: false, defaultValue: 0 },
  valuationMethod:  { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'weighted_avg', field: 'valuation_method' },
  runningBalance:   { type: DataTypes.DECIMAL(14,4), allowNull: false, defaultValue: 0, field: 'running_balance' },
  transactionDate:  { type: DataTypes.DATEONLY, allowNull: false, field: 'transaction_date' },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  createdBy:        { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt:        { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'StockLedger',
  tableName: 'stock_ledger',
  underscored: true,
  timestamps: false,          // append-only: only createdAt, no updatedAt
  createdAt: 'created_at',
  indexes: [
    { fields: ['org_id'] },
    { fields: ['item_id'] },
    { fields: ['warehouse_id'] },
    { fields: ['client_id'] },
    { fields: ['transaction_date'] },
  ],
});
