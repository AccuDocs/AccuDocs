import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientExpense extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public expenseDate: Date;
  declare public category: string;
  declare public description: string;
  declare public vendorName: string | null;
  declare public amount: number;
  declare public paymentMode: string;
  declare public referenceNo: string | null;
  declare public month: number;
  declare public financialYear: string;
  // V2 Fields
  declare public gstApplicable: boolean;
  declare public gstRate: number;
  declare public gstAmount: number;
  declare public itcAllowed: boolean;
  declare public itcBlockedReason: string | null;
  declare public status: string;
  declare public notes: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ClientExpense.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'expense_date' },
  category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'general' },
  description: { type: DataTypes.TEXT, allowNull: false },
  vendorName: { type: DataTypes.STRING(200), allowNull: true, field: 'vendor_name' },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  paymentMode: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'cash', field: 'payment_mode' },
  referenceNo: { type: DataTypes.STRING(50), allowNull: true, field: 'reference_no' },
  month: { type: DataTypes.INTEGER, allowNull: false },
  financialYear: { type: DataTypes.STRING(9), allowNull: false, field: 'financial_year' },
  // V2 Fields
  gstApplicable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'gst_applicable' },
  gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'gst_rate' },
  gstAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'gst_amount' },
  itcAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'itc_allowed' },
  itcBlockedReason: { type: DataTypes.STRING(100), allowNull: true, field: 'itc_blocked_reason' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'ClientExpense',
  tableName: 'client_expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
