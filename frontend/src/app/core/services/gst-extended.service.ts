import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';

export interface HsnSacCode {
  id: string;
  code: string;
  description: string;
  gstRate: number;
  type: 'HSN' | 'SAC';
  chapter: string | null;
  isActive: boolean;
}

export interface ItcLedgerRecord {
  id: string;
  clientId: string;
  period: string;
  igstClaimed: number;
  cgstClaimed: number;
  sgstClaimed: number;
  eligibleItc: number;
  ineligibleItc: number;
  reversedItc: number;
  source: 'GSTR2A' | 'manual';
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Gstr2aEntry {
  supplierGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxablePurchase: number;
  igst: number;
  cgst: number;
  sgst: number;
}

export interface Gstr2aReconciliation {
  id: string;
  clientId: string;
  period: string;
  matched: any[];
  mismatched: any[];
  missingInBooks: any[];
  missingIn2a: any[];
  totalMatched: number;
  totalMismatched: number;
  totalMissingBooks: number;
  totalMissing2a: number;
  reconciledAt: string;
}

export interface HsnSacSearchParams {
  q?: string;
  type?: 'HSN' | 'SAC';
  rate?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class GstExtendedService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/gst`;

  // ─── HSN/SAC Directory ────────────────────────────────────────────────────
  searchHsnSac(params: HsnSacSearchParams = {}): Observable<PaginatedApiResponse<HsnSacCode>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.rate !== undefined) httpParams = httpParams.set('rate', String(params.rate));
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<PaginatedApiResponse<HsnSacCode>>(`${this.base}/hsn-sac/search`, {
      params: httpParams,
    });
  }

  getHsnSacById(id: string): Observable<ApiResponse<HsnSacCode>> {
    return this.http.get<ApiResponse<HsnSacCode>>(`${this.base}/hsn-sac/${id}`);
  }

  importHsnSacExcel(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.base}/hsn-sac/import`, formData);
  }

  lookupOnlineHsn(code: string): Observable<ApiResponse<HsnSacCode>> {
    return this.http.post<ApiResponse<HsnSacCode>>(`${this.base}/hsn-sac/lookup-online`, { code });
  }

  // ─── ITC Tracker ──────────────────────────────────────────────────────────
  getITCLedger(clientId: string, period?: string): Observable<ApiResponse<ItcLedgerRecord[]>> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<ApiResponse<ItcLedgerRecord[]>>(`${this.base}/itc/${clientId}`, { params });
  }

  calculateITC(clientId: string, period: string): Observable<ApiResponse<ItcLedgerRecord & { purchasesCount: number }>> {
    return this.http.post<ApiResponse<ItcLedgerRecord & { purchasesCount: number }>>(
      `${this.base}/itc/${clientId}/calculate`,
      { period }
    );
  }

  // ─── GSTR-2A Reconciliation ────────────────────────────────────────────────
  reconcileGSTR2A(
    clientId: string,
    period: string,
    gstr2aData: Gstr2aEntry[]
  ): Observable<ApiResponse<Gstr2aReconciliation>> {
    return this.http.post<ApiResponse<Gstr2aReconciliation>>(`${this.base}/gstr2a/reconcile`, {
      clientId,
      period,
      gstr2aData,
    });
  }

  getReconciliation(
    clientId: string,
    period?: string
  ): Observable<ApiResponse<Gstr2aReconciliation[]>> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<ApiResponse<Gstr2aReconciliation[]>>(
      `${this.base}/gstr2a/reconciliation/${clientId}`,
      { params }
    );
  }
}
