export type SubLedgerSection =
  | 'dashboard'
  | 'customers'
  | 'vendors'
  | 'inventory'
  | 'employees'
  | 'tax'
  | 'bank'
  | 'outstanding'
  | 'reports'
  | 'audit-logs';

export interface SubLedgerKpis {
  totalSubLedgers: number;
  receivableAmount: number;
  payableAmount: number;
  overdueAmount: number;
  todayTransactions: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface TopAccountBalance {
  id: string;
  name: string;
  balance: number;
}

export interface PartyBalance {
  id: string;
  code: string | null;
  name: string;
  gstin?: string | null;
  mobile?: string | null;
  creditLimit?: number;
  creditDays?: number;
  totalDebit?: number;
  totalCredit?: number;
  balance: number;
  overdueAmount?: number;
  lastTransactionDate?: string | null;
  rating?: 'good' | 'watch' | 'risk';
}

export interface InventoryBalance {
  id: string;
  code: string | null;
  name: string;
  hsn: string | null;
  inQty: number;
  outQty: number;
  balance: number;
  stockValue: number;
  lastTransactionDate: string | null;
}

export interface LedgerEntry {
  id: string;
  partyId?: string | null;
  partyName?: string | null;
  date: string | null;
  voucher: string | null;
  transactionType: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  balanceLabel?: string;
  referenceId?: string | null;
}

export interface AgeingRow {
  id: string;
  code: string | null;
  name: string;
  totalOutstanding: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  nextDueDate: string | null;
}

export interface ReportRow {
  name: string;
  amount: number;
  rows: number;
}

export interface TaxSummary {
  gstInput: number;
  gstOutput: number;
  tdsAmount: number;
  tcsAmount: number;
  netGstPayable: number;
}

export interface SubLedgerDashboard {
  kpis: SubLedgerKpis;
  monthlyCollections: ChartPoint[];
  outstandingChart: ChartPoint[];
  topCustomers: TopAccountBalance[];
  topVendors: TopAccountBalance[];
}

export interface SubLedgerResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
