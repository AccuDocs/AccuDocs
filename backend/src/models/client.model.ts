import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Client extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public userId: string;
  declare public code: string;
  declare public name: string;
  declare public gstin: string | null;
  declare public pan: string | null;
  declare public mobile: string | null;
  declare public email: string | null;
  declare public address: string | null;
  declare public stateCode: string;
  declare public city: string | null;
  declare public pincode: string | null;
  declare public location: string | null;
  declare public creditLimit: number;
  declare public entityType: string;
  declare public businessName: string | null;
  declare public industrySector: string | null;
  declare public incorporationDate: Date | null;
  declare public gstStatus: string | null;
  declare public financialYearEnd: string | null;
  declare public accountingMethod: string | null;
  declare public estimatedTurnover: string | null;
  declare public employeeCount: string | null;
  declare public identityProofUrl: string | null;
  declare public businessRegistrationUrl: string | null;
  declare public taxCardCopyUrl: string | null;
  declare public previousYearReturnUrl: string | null;
  declare public termsAccepted: boolean;
  declare public notes: string | null;
  declare public metadata: any;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Client.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  code: { type: DataTypes.STRING(10), allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  gstin: { type: DataTypes.STRING(15), allowNull: true },
  pan: { type: DataTypes.STRING(25), allowNull: true },
  mobile: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  stateCode: { type: DataTypes.CHAR(2), allowNull: false, defaultValue: '24', field: 'state_code' },
  city: { type: DataTypes.STRING(100), allowNull: true },
  pincode: { type: DataTypes.STRING(20), allowNull: true },
  location: { type: DataTypes.STRING(255), allowNull: true },
  creditLimit: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'credit_limit' },
  entityType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'individual', field: 'entity_type' },
  businessName: { type: DataTypes.STRING(200), allowNull: true, field: 'business_name' },
  industrySector: { type: DataTypes.STRING(100), allowNull: true, field: 'industry_sector' },
  incorporationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'incorporation_date' },
  gstStatus: { type: DataTypes.STRING(30), allowNull: true, field: 'gst_status' },
  financialYearEnd: { type: DataTypes.STRING(50), allowNull: true, field: 'financial_year_end' },
  accountingMethod: { type: DataTypes.STRING(30), allowNull: true, field: 'accounting_method' },
  estimatedTurnover: { type: DataTypes.STRING(100), allowNull: true, field: 'estimated_turnover' },
  employeeCount: { type: DataTypes.STRING(50), allowNull: true, field: 'employee_count' },
  identityProofUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'identity_proof_url' },
  businessRegistrationUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'business_registration_url' },
  taxCardCopyUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'tax_card_copy_url' },
  previousYearReturnUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'previous_year_return_url' },
  termsAccepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'terms_accepted' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Client',
  tableName: 'clients',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['organization_id', 'code'] }
  ]
});
