import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientSale extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public invoiceNo: string;
  declare public invoiceDate: Date;
  declare public customerName: string;
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
  // V2 Fields
  declare public gstin: string | null;
  declare public invoiceType: string;
  declare public placeOfSupply: string | null;
  declare public cgstAmount: number;
  declare public sgstAmount: number;
  declare public igstAmount: number;
  declare public cessAmount: number;
  declare public isNilRated: boolean;
  declare public isAdvance: boolean;
  declare public status: string;
  declare public notes: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ClientSale.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  invoiceNo: { type: DataTypes.STRING(50), allowNull: false, field: 'invoice_no' },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'invoice_date' },
  customerName: { type: DataTypes.STRING(200), allowNull: false, field: 'customer_name' },
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
  // V2 Fields
  gstin: { type: DataTypes.STRING(15), allowNull: true },
  invoiceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'B2B', field: 'invoice_type' },
  placeOfSupply: { type: DataTypes.CHAR(2), allowNull: true, field: 'place_of_supply' },
  cgstAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'cgst_amount' },
  sgstAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'sgst_amount' },
  igstAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'igst_amount' },
  cessAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'cess_amount' },
  isNilRated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_nil_rated' },
  isAdvance: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_advance' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'ClientSale',
  tableName: 'client_sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
