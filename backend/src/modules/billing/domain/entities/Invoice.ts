import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";
import { InvoiceLineItem } from "./InvoiceLineItem";

export interface InvoiceProps {
  organizationId: string;
  clientId: string;
  recurringTemplateId?: string | null;
  invoiceType?: 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
  invoiceNumber: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  invoiceDate: Date;
  dueDate: Date;
  expiryDate?: Date | null;
  issuedAt?: Date | null;
  paidAt?: Date | null;
  cancelledAt?: Date | null;
  gstType: 'CGST_SGST' | 'IGST';
  placeOfSupply: string;
  clientGstin?: string | null;
  firmGstin?: string | null;
  subtotal: number;
  discountType?: 'percent' | 'flat' | null;
  discountValue?: number;
  discountAmount?: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  receiverName?: string | null;
  receiverAddress?: string | null;
  cancelReason?: string | null;
  internalNotes?: string | null;
  pdfS3Key?: string | null;
  pdfGeneratedAt?: Date | null;
  whatsappSentAt?: Date | null;
  whatsappSentBy?: string | null;
  emailSentAt?: Date | null;
  createdBy: string;
  issuedBy?: string | null;
  cancelledBy?: string | null;
  lineItems?: InvoiceLineItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Invoice extends Entity<InvoiceProps> {
  // Getters for all properties
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get recurringTemplateId() { return this.props.recurringTemplateId; }
  get invoiceType() { return this.props.invoiceType; }
  get invoiceNumber() { return this.props.invoiceNumber; }
  get status() { return this.props.status; }
  get invoiceDate() { return this.props.invoiceDate; }
  get dueDate() { return this.props.dueDate; }
  get expiryDate() { return this.props.expiryDate; }
  get issuedAt() { return this.props.issuedAt; }
  get paidAt() { return this.props.paidAt; }
  get cancelledAt() { return this.props.cancelledAt; }
  get gstType() { return this.props.gstType; }
  get placeOfSupply() { return this.props.placeOfSupply; }
  get clientGstin() { return this.props.clientGstin; }
  get firmGstin() { return this.props.firmGstin; }
  get subtotal() { return this.props.subtotal; }
  get discountType() { return this.props.discountType; }
  get discountValue() { return this.props.discountValue; }
  get discountAmount() { return this.props.discountAmount; }
  get cgstAmount() { return this.props.cgstAmount; }
  get sgstAmount() { return this.props.sgstAmount; }
  get igstAmount() { return this.props.igstAmount; }
  get roundOff() { return this.props.roundOff; }
  get totalAmount() { return this.props.totalAmount; }
  get amountPaid() { return this.props.amountPaid; }
  get balanceDue() { return this.props.balanceDue; }
  get notes() { return this.props.notes; }
  get receiverName() { return this.props.receiverName; }
  get receiverAddress() { return this.props.receiverAddress; }
  get cancelReason() { return this.props.cancelReason; }
  get internalNotes() { return this.props.internalNotes; }
  get pdfS3Key() { return this.props.pdfS3Key; }
  get pdfGeneratedAt() { return this.props.pdfGeneratedAt; }
  get whatsappSentAt() { return this.props.whatsappSentAt; }
  get whatsappSentBy() { return this.props.whatsappSentBy; }
  get emailSentAt() { return this.props.emailSentAt; }
  get createdBy() { return this.props.createdBy; }
  get issuedBy() { return this.props.issuedBy; }
  get cancelledBy() { return this.props.cancelledBy; }
  get lineItems() { return this.props.lineItems || []; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: InvoiceProps, id?: string) {
    super(props, id);
  }

  public static create(props: InvoiceProps, id?: string): Result<Invoice> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.clientId, argumentName: 'clientId' },
      { argument: props.invoiceNumber, argumentName: 'invoiceNumber' },
      { argument: props.status, argumentName: 'status' },
      { argument: props.invoiceDate, argumentName: 'invoiceDate' },
      { argument: props.dueDate, argumentName: 'dueDate' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Invoice>(guardResult.getError() as string);
    return Result.ok<Invoice>(new Invoice(props, id));
  }
}
