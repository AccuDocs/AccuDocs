import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Invoice extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public recurringTemplateId: string | null;
  
  declare public invoiceType: 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
  declare public partyRole: 'customer' | 'vendor';
  declare public invoiceNumber: string;
  declare public status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  
  declare public invoiceDate: Date;
  declare public dueDate: Date;
  declare public expiryDate: Date | null;
  declare public issuedAt: Date | null;
  declare public paidAt: Date | null;
  declare public cancelledAt: Date | null;
  declare public paymentLinkToken: string | null;
  declare public paymentLinkExpiresAt: Date | null;
  
  declare public gstType: 'CGST_SGST' | 'IGST';
  declare public placeOfSupply: string;
  declare public clientGstin: string | null;
  declare public firmGstin: string | null;
  
  declare public subtotal: number;
  declare public discountType: 'percent' | 'flat' | null;
  declare public discountValue: number;
  declare public discountAmount: number;
  declare public cgstAmount: number;
  declare public sgstAmount: number;
  declare public igstAmount: number;
  declare public roundOff: number;
  declare public totalAmount: number;
  declare public amountPaid: number;
  declare public balanceDue: number;
  
  declare public currency: string;
  declare public exchangeRate: number;
  
  declare public notes: string | null;
  declare public cancelReason: string | null;
  declare public internalNotes: string | null;
  
  declare public pdfS3Key: string | null;
  declare public pdfGeneratedAt: Date | null;
  declare public whatsappSentAt: Date | null;
  declare public whatsappSentBy: string | null;
  declare public emailSentAt: Date | null;
  
  declare public createdBy: string;
  declare public issuedBy: string | null;
  declare public cancelledBy: string | null;

  declare public receiverName: string | null;
  declare public receiverAddress: string | null;
  
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
  
  // Mixins injected safely at association
  declare public readonly lineItems?: any[]; 
}

Invoice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  recurringTemplateId: { type: DataTypes.UUID, allowNull: true, field: 'recurring_template_id' },
  
  invoiceType: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'tax_invoice', field: 'invoice_type' },
  partyRole: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'customer', field: 'party_role' },
  invoiceNumber: { type: DataTypes.STRING(30), allowNull: false, field: 'invoice_number' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'invoice_date' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  issuedAt: { type: DataTypes.DATE, allowNull: true, field: 'issued_at' },
  paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
  cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
  paymentLinkToken: { type: DataTypes.UUID, allowNull: true, field: 'payment_link_token' },
  paymentLinkExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'payment_link_expires_at' },
  
  gstType: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'CGST_SGST', field: 'gst_type' },
  placeOfSupply: { type: DataTypes.CHAR(2), allowNull: false, defaultValue: '24', field: 'place_of_supply' },
  clientGstin: { type: DataTypes.STRING(15), allowNull: true, field: 'client_gstin' },
  firmGstin: { type: DataTypes.STRING(15), allowNull: true, field: 'firm_gstin' },
  
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'subtotal' },
  discountType: { type: DataTypes.STRING(10), allowNull: true, field: 'discount_type' },
  discountValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'discount_value' },
  discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'discount_amount' },
  cgstAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'cgst_amount' },
  sgstAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'sgst_amount' },
  igstAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'igst_amount' },
  roundOff: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00, field: 'round_off' },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'total_amount' },
  amountPaid: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00, field: 'amount_paid' },
  // GENERATED ALWAYS AS (total_amount - amount_paid) STORED natively in PG
  // Need to mark as VIRTUAL or readOnly for Sequelize, but the prompt says 
  // "mark them as field only, never update them". We'll define it precisely.
  balanceDue: { 
    type: DataTypes.DECIMAL(12, 2), 
    field: 'balance_due' 
  },
  
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
  exchangeRate: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1.000000, field: 'exchange_rate' },
  
  notes: { type: DataTypes.TEXT, allowNull: true },
  cancelReason: { type: DataTypes.TEXT, allowNull: true, field: 'cancel_reason' },
  internalNotes: { type: DataTypes.TEXT, allowNull: true, field: 'internal_notes' },
  
  receiverName: { type: DataTypes.STRING(200), allowNull: true, field: 'receiver_name' },
  receiverAddress: { type: DataTypes.TEXT, allowNull: true, field: 'receiver_address' },
  
  pdfS3Key: { type: DataTypes.STRING(500), allowNull: true, field: 'pdf_s3_key' },
  pdfGeneratedAt: { type: DataTypes.DATE, allowNull: true, field: 'pdf_generated_at' },
  whatsappSentAt: { type: DataTypes.DATE, allowNull: true, field: 'whatsapp_sent_at' },
  whatsappSentBy: { type: DataTypes.UUID, allowNull: true, field: 'whatsapp_sent_by' },
  emailSentAt: { type: DataTypes.DATE, allowNull: true, field: 'email_sent_at' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
  
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  issuedBy: { type: DataTypes.UUID, allowNull: true, field: 'issued_by' },
  cancelledBy: { type: DataTypes.UUID, allowNull: true, field: 'cancelled_by' },
}, {
  sequelize,
  modelName: 'Invoice',
  tableName: 'invoices',
  underscored: true,
  paranoid: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['organization_id', 'invoice_number'] }
  ]
});
