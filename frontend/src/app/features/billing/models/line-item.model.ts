export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  serviceTemplateId?: string;
  itemId?: string;
  variantId?: string;
  warehouseId?: string;
  batchNo?: string;
  trackInventory?: boolean;
  description: string;
  sacCode: string;
  quantity: number;
  unitRate: number;
  amount: number;
  sortOrder: number;
}
