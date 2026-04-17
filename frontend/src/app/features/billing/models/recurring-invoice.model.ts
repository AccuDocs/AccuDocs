export interface RecurringInvoiceConfig {
  id: string;
  organizationId: string;
  baseInvoiceId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRunDate: string;
  endDate: string | null;
  autoSend: boolean;
  lastGeneratedInvoiceId: string | null;
  status: 'active' | 'paused' | 'completed';
  totalGenerated: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  baseInvoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    clientId: string;
  };
}

export interface CreateRecurringInvoiceDto {
  baseInvoiceId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRunDate: string;
  endDate?: string;
  autoSend: boolean;
}
