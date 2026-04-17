import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export type EInvoiceStatus = 'generated' | 'cancelled' | 'failed';

export class EInvoice extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public invoiceId: string;
  declare public irn: string | null;
  declare public ackNo: string | null;
  declare public ackDate: Date | null;
  declare public signedInvoice: any;
  declare public signedQrCode: string | null;
  declare public status: EInvoiceStatus;
  declare public errorMessage: string | null;
  declare public rawResponse: any;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

EInvoice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
  irn: { type: DataTypes.STRING(64), allowNull: true },
  ackNo: { type: DataTypes.STRING(30), allowNull: true, field: 'ack_no' },
  ackDate: { type: DataTypes.DATE, allowNull: true, field: 'ack_date' },
  signedInvoice: { type: DataTypes.JSONB, allowNull: true, field: 'signed_invoice' },
  signedQrCode: { type: DataTypes.TEXT, allowNull: true, field: 'signed_qr_code' },
  status: {
    type: DataTypes.ENUM('generated', 'cancelled', 'failed'),
    allowNull: false,
    defaultValue: 'generated',
  },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
  rawResponse: { type: DataTypes.JSONB, allowNull: true, field: 'raw_response' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'EInvoice',
  tableName: 'e_invoices',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['irn'], where: { irn: { $ne: null } } as any },
    { fields: ['invoice_id'] },
    { fields: ['organization_id', 'status'] },
  ],
});
