import { InvoiceLineItem } from './line-item.model';
import { Payment, PaymentMode } from './payment.model';

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type GstType = 'CGST_SGST' | 'IGST';

export interface InvoiceClient {
  id: string;
  name: string;
  code?: string;
  gstin?: string;
  mobile?: string;
  stateCode: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  clientId: string;
  client?: InvoiceClient;
  recurringTemplateId?: string;
  invoiceNumber: string;
  invoiceType?: 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
  expiryDate?: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  issuedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  gstType: GstType;
  placeOfSupply: string;
  clientGstin?: string;
  firmGstin?: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  cancelReason?: string;
  pdfS3Key?: string;
  pdfGeneratedAt?: string;
  whatsappSentAt?: string;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus | '';
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateLineItemDto {
  description: string;
  sacCode: string;
  quantity: number;
  unitRate: number;
  serviceTemplateId?: string;
}

export interface CreateInvoiceDto {
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType?: 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
  expiryDate?: string;
  notes?: string;
  clientGstin?: string;
  gstType?: GstType;
  lineItems: CreateLineItemDto[];
}

export interface UpdateInvoiceDto {
  invoiceDate?: string;
  dueDate?: string;
  invoiceType?: 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
  expiryDate?: string;
  notes?: string;
  clientGstin?: string;
  gstType?: GstType;
  lineItems?: CreateLineItemDto[];
}

export interface RecordPaymentDto {
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

export interface InvoiceMutationResponse {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: InvoiceStatus;
}
