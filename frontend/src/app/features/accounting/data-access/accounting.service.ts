import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type NormalBalance = 'debit' | 'credit';
export type VoucherStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled';
export type VoucherType =
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'receipt'
  | 'payment'
  | 'credit_note'
  | 'debit_note'
  | 'journal'
  | 'contra'
  | 'expense'
  | 'stock_transfer'
  | 'opening'
  | 'closing'
  | 'gst_settlement'
  | 'bank_reconciliation';

export interface AccountingQuery {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  accountId?: string;
  voucherType?: VoucherType;
  status?: string;
  limit?: number;
}

export interface AccountingDashboard {
  period: { startDate: string; endDate: string };
  summary: {
    revenue: number;
    expenses: number;
    netProfit: number;
    bankBalance: number;
    cashBalance: number;
    receivables: number;
    payables: number;
    gstNet: number;
    accountCount: number;
    voucherCount: number;
    postedJournalCount: number;
    postedDebit: number;
    postedCredit: number;
    isBalanced: boolean;
  };
  recentTransactions: AccountingVoucher[];
}

export interface AccountingAccount {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  subType?: string | null;
  normalBalance: NormalBalance;
  controlType?: string | null;
  openingBalance: number;
  openingBalanceType: NormalBalance;
  currentBalance: number;
  currencyCode: string;
  gstApplicable: boolean;
  status: string;
  systemDefined: boolean;
  groupId: string;
  groupCode: string;
  groupName: string;
  reportSection?: string | null;
  parentAccountCode?: string | null;
  parentAccountName?: string | null;
}

export interface AccountingGroup {
  id: string;
  code: string;
  name: string;
  groupType: AccountType;
  normalBalance: NormalBalance;
  reportSection?: string | null;
  parentId?: string | null;
  accountCount: number;
  balance: number;
}

export interface AccountingAccountsPayload {
  accounts: AccountingAccount[];
  groups: AccountingGroup[];
}

export interface AccountingVoucher {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  voucherDate: string;
  sourceModule: string;
  sourceType: string;
  sourceId?: string | null;
  partyType?: string;
  partyId?: string | null;
  totalDebit: number;
  totalCredit: number;
  narration?: string | null;
  status: VoucherStatus;
  approvalStatus?: string;
  postedAt?: string | null;
  journalEntryId?: string | null;
  entryNo?: string | null;
}

export interface AccountingLinePayload {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  partyType?: string;
  partyId?: string | null;
  referenceType?: string;
  referenceId?: string | null;
}

export interface CreateVoucherPayload {
  voucherType: VoucherType;
  voucherDate: string;
  status: 'draft' | 'posted';
  narration?: string;
  sourceModule?: string;
  sourceType?: string;
  partyType?: string;
  partyId?: string | null;
  lines: AccountingLinePayload[];
}

export interface CreateAccountPayload {
  accountCode: string;
  name: string;
  accountType: AccountType;
  accountGroupId?: string;
  accountGroupCode?: string;
  parentAccountId?: string;
  normalBalance?: NormalBalance;
  openingBalance?: number;
  openingBalanceType?: NormalBalance;
  openingBalanceDate?: string;
  gstApplicable?: boolean;
  hsnSacCode?: string;
}

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  groupName: string;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalancePayload {
  period: { startDate: string; endDate: string };
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number; isBalanced: boolean };
}

export interface StatementLine {
  accountType?: AccountType;
  groupName?: string;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  debit?: number;
  credit?: number;
  amount: number;
}

export interface ProfitLossPayload {
  period: { startDate: string; endDate: string };
  lines: StatementLine[];
  totals: { revenue: number; expenses: number; netProfit: number };
}

export interface BalanceSheetPayload {
  asOfDate: string;
  lines: StatementLine[];
  currentPeriodProfit: number;
  totals: { assets: number; liabilities: number; equity: number; liabilitiesAndEquity: number; isBalanced: boolean };
}

export interface CashFlowPayload {
  period: { startDate: string; endDate: string };
  rows: Array<{
    date: string;
    reference: string;
    accountName: string;
    description?: string | null;
    inflow: number;
    outflow: number;
  }>;
  totals: { operatingInflow: number; operatingOutflow: number; netCashMovement: number };
}

export interface OutstandingPayload {
  asOfDate: string;
  partyType: 'customer' | 'vendor';
  rows: Array<{
    partyId: string;
    partyName: string;
    debit: number;
    credit: number;
    balance: number;
    lastTransactionDate?: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/accounting`;

  dashboard(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<AccountingDashboard>>(`${this.base}/dashboard`, { params: this.params(query) });
  }

  accounts(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<AccountingAccountsPayload>>(`${this.base}/accounts`, { params: this.params(query) });
  }

  createAccount(payload: CreateAccountPayload) {
    return this.http.post<ApiResponse<AccountingAccount>>(`${this.base}/accounts`, payload);
  }

  vouchers(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<AccountingVoucher[]>>(`${this.base}/vouchers`, { params: this.params(query) });
  }

  createVoucher(payload: CreateVoucherPayload) {
    return this.http.post<ApiResponse<{ voucherId: string; journalEntryId: string; voucherNo: string; entryNo: string; status: string }>>(`${this.base}/vouchers`, payload);
  }

  trialBalance(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<TrialBalancePayload>>(`${this.base}/reports/trial-balance`, { params: this.params(query) });
  }

  profitLoss(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<ProfitLossPayload>>(`${this.base}/reports/profit-loss`, { params: this.params(query) });
  }

  balanceSheet(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<BalanceSheetPayload>>(`${this.base}/reports/balance-sheet`, { params: this.params(query) });
  }

  cashFlow(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<CashFlowPayload>>(`${this.base}/reports/cash-flow`, { params: this.params(query) });
  }

  receivables(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<OutstandingPayload>>(`${this.base}/receivables`, { params: this.params(query) });
  }

  payables(query: AccountingQuery = {}) {
    return this.http.get<ApiResponse<OutstandingPayload>>(`${this.base}/payables`, { params: this.params(query) });
  }

  private params(values: AccountingQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
