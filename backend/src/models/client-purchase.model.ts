import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientPurchase extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public billNo: string;
  declare public billDate: Date;
  declare public vendorName: string;
  declare public description: string | null;
  declare public hsnSacCode: string | null;
  declare public quantity: number;
  declare public rate: number | null;
  declare public baseAmount: number;
  declare public gstRate: number;
  declare public gstAmount: number;
  declare public totalAmount: number;
  declare public month: number;
  declare public financialYear: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ClientPurchase.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  billNo: { type: DataTypes.STRING(50), allowNull: false, field: 'bill_no' },
  billDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'bill_date' },
  vendorName: { type: DataTypes.STRING(200), allowNull: false, field: 'vendor_name' },
  description: { type: DataTypes.TEXT, allowNull: true },
  hsnSacCode: { type: DataTypes.STRING(20), allowNull: true, field: 'hsn_sac_code' },
  quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
  rate: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  baseAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'base_amount' },
  gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18.00, field: 'gst_rate' },
  gstAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'gst_amount' },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'total_amount' },
  month: { type: DataTypes.INTEGER, allowNull: false },
  financialYear: { type: DataTypes.STRING(9), allowNull: false, field: 'financial_year' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'ClientPurchase',
  tableName: 'client_purchases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
