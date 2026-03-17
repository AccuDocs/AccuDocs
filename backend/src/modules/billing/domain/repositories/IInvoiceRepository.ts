import { Invoice } from "../entities/Invoice";

export interface IInvoiceRepository {
  save(invoice: Invoice, options?: any): Promise<Invoice>;
  findById(id: string, organizationId: string): Promise<Invoice | null>;
  findByInvoiceNumber(invoiceNumber: string, organizationId: string): Promise<Invoice | null>;
  findAll(organizationId: string, filters: any, pagination: any): Promise<{ invoices: Invoice[], total: number }>;
  generateNextInvoiceNumber(organizationId: string, financialYear: string): Promise<string>;
}
