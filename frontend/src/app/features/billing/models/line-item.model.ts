export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  serviceTemplateId?: string;
  description: string;
  sacCode: string;
  quantity: number;
  unitRate: number;
  amount: number;
  sortOrder: number;
}
