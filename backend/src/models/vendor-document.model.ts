import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class VendorDocument extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public vendorId: string;
  declare public documentType: 'gst_certificate' | 'contract' | 'agreement' | 'quotation' | 'bill' | 'other';
  declare public name: string;
  declare public fileUrl: string | null;
  declare public notes: string | null;
  declare public uploadedBy: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

VendorDocument.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
  documentType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'other', field: 'document_type' },
  name: { type: DataTypes.STRING(220), allowNull: false },
  fileUrl: { type: DataTypes.STRING(600), allowNull: true, field: 'file_url' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  uploadedBy: { type: DataTypes.UUID, allowNull: false, field: 'uploaded_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'VendorDocument',
  tableName: 'vendor_documents',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['organization_id', 'vendor_id'] },
    { fields: ['document_type'] },
  ],
});
