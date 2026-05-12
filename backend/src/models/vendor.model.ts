import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Vendor extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string | null;
  declare public vendorCode: string;
  declare public vendorName: string;
  declare public businessName: string | null;
  declare public vendorType: 'goods_supplier' | 'service_provider' | 'contractor' | 'consultant';
  declare public gstNumber: string | null;
  declare public panNumber: string | null;
  declare public contactPerson: string | null;
  declare public mobile: string | null;
  declare public email: string | null;
  declare public billingAddress: string | null;
  declare public shippingAddress: string | null;
  declare public paymentTerms: string | null;
  declare public creditDays: number;
  declare public creditLimit: number;
  declare public status: 'active' | 'blocked';
  declare public notes: string | null;
  declare public metadata: Record<string, unknown>;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Vendor.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: true, field: 'client_id' },
  vendorCode: { type: DataTypes.STRING(30), allowNull: false, field: 'vendor_code' },
  vendorName: { type: DataTypes.STRING(180), allowNull: false, field: 'vendor_name' },
  businessName: { type: DataTypes.STRING(220), allowNull: true, field: 'business_name' },
  vendorType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'goods_supplier', field: 'vendor_type' },
  gstNumber: { type: DataTypes.STRING(15), allowNull: true, field: 'gst_number' },
  panNumber: { type: DataTypes.STRING(25), allowNull: true, field: 'pan_number' },
  contactPerson: { type: DataTypes.STRING(150), allowNull: true, field: 'contact_person' },
  mobile: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  billingAddress: { type: DataTypes.TEXT, allowNull: true, field: 'billing_address' },
  shippingAddress: { type: DataTypes.TEXT, allowNull: true, field: 'shipping_address' },
  paymentTerms: { type: DataTypes.STRING(120), allowNull: true, field: 'payment_terms' },
  creditDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'credit_days' },
  creditLimit: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, field: 'credit_limit' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Vendor',
  tableName: 'vendors',
  paranoid: true,
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['organization_id', 'vendor_code'] },
    { fields: ['organization_id', 'client_id'] },
    { fields: ['organization_id', 'status'] },
    { fields: ['organization_id', 'vendor_type'] },
  ],
});
