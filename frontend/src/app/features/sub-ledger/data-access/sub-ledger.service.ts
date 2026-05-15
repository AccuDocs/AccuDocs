import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import {
  AgeingRow,
  InventoryBalance,
  LedgerEntry,
  PartyBalance,
  ReportRow,
  SubLedgerDashboard,
  SubLedgerResponse,
  TaxSummary,
} from '../models/sub-ledger.models';

export interface LedgerQuery {
  clientId?: string | null;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface PartyLedgerPayload {
  normalBalance: 'debit' | 'credit';
  summaries: PartyBalance[];
  entries: LedgerEntry[];
}

export interface InventoryLedgerPayload {
  summaries: InventoryBalance[];
  entries: LedgerEntry[];
}

export interface TaxLedgerPayload {
  summary: TaxSummary;
  entries: LedgerEntry[];
}

export interface OutstandingPayload {
  receivables: AgeingRow[];
  payables: AgeingRow[];
}

export interface ReportsPayload {
  reports: ReportRow[];
}

export interface AuditLogsPayload {
  entries: LedgerEntry[];
}

@Injectable({ providedIn: 'root' })
export class SubLedgerService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/sub-ledger`;

  dashboard(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<SubLedgerDashboard>>(`${this.base}/dashboard`, { params: this.params(query) });
  }

  customers(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<PartyLedgerPayload>>(`${this.base}/customers`, { params: this.params(query) });
  }

  vendors(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<PartyLedgerPayload>>(`${this.base}/vendors`, { params: this.params(query) });
  }

  inventory(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<InventoryLedgerPayload>>(`${this.base}/inventory`, { params: this.params(query) });
  }

  employees(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<PartyLedgerPayload>>(`${this.base}/employees`, { params: this.params(query) });
  }

  tax(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<TaxLedgerPayload>>(`${this.base}/tax`, { params: this.params(query) });
  }

  bank(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<PartyLedgerPayload>>(`${this.base}/bank`, { params: this.params(query) });
  }

  outstanding(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<OutstandingPayload>>(`${this.base}/outstanding`, { params: this.params(query) });
  }

  reports(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<ReportsPayload>>(`${this.base}/reports`, { params: this.params(query) });
  }

  auditLogs(query: LedgerQuery = {}) {
    return this.http.get<SubLedgerResponse<AuditLogsPayload>>(`${this.base}/audit-logs`, { params: this.params(query) });
  }

  private params(query: LedgerQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
