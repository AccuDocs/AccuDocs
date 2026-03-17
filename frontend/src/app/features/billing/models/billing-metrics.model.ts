export interface BillingMetrics {
  totalInvoices: number;
  draftCount: number;
  draftValue: number;
  issuedCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  paidCount: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectedThisMonth: number;
  billedThisMonth: number;
}
