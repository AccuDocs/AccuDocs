import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
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
  updatedAt?: string;
  createdAt?: string;
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
  live?: boolean;
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
    if (params.live) httpParams = httpParams.set('live', 'true');

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

  syncLiveHsnSac(codes: string[]): Observable<ApiResponse<{
    requested: number;
    processed: number;
    succeeded: number;
    failed: number;
    notFound: number;
    refreshedAt: string;
    results: Array<{ code: string; status: 'updated' | 'failed' | 'not_found'; description?: string; message?: string }>;
  }>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/hsn-sac/sync-live`, { codes }).pipe(
      catchError((error) => {
        if (error.status !== 404) {
          return throwError(() => error);
        }

        return this.syncLiveHsnSacFallback(codes);
      })
    );
  }

  private syncLiveHsnSacFallback(codes: string[]): Observable<ApiResponse<{
    requested: number;
    processed: number;
    succeeded: number;
    failed: number;
    notFound: number;
    refreshedAt: string;
    results: Array<{ code: string; status: 'updated' | 'failed' | 'not_found'; description?: string; message?: string }>;
  }>> {
    const uniqueCodes = [...new Set(
      codes
        .map((code) => String(code || '').replace(/[^0-9]/g, ''))
        .filter((code) => /^\d{4,8}$/.test(code))
    )].slice(0, 20);

    if (uniqueCodes.length === 0) {
      return of({
        success: true,
        message: 'No valid HSN/SAC codes to sync',
        data: {
          requested: codes.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
          notFound: 0,
          refreshedAt: new Date().toISOString(),
          results: [],
        },
      });
    }

    const lookups = uniqueCodes.map((code) =>
      this.lookupOnlineHsn(code).pipe(
        map((res) => ({
          code,
          status: 'updated' as const,
          description: res.data?.description,
        })),
        catchError((err) => of({
          code,
          status: err.status === 404 ? 'not_found' as const : 'failed' as const,
          message: err.error?.message || err.message || 'Live lookup failed',
        }))
      )
    );

    return forkJoin(lookups).pipe(
      map((results) => ({
        success: true,
        message: 'Live sync completed through lookup fallback',
        data: {
          requested: codes.length,
          processed: uniqueCodes.length,
          succeeded: results.filter((result) => result.status === 'updated').length,
          failed: results.filter((result) => result.status === 'failed').length,
          notFound: results.filter((result) => result.status === 'not_found').length,
          refreshedAt: new Date().toISOString(),
          results,
        },
      }))
    );
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

  // ─── E-Way Bill (Phase 2) ─────────────────────────────────────────────────
  generateEWayBill(data: {
    invoiceId: string;
    transporterId?: string;
    vehicleNo?: string;
    distanceKm: number;
    transportMode: 'road' | 'rail' | 'air' | 'ship';
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/eway-bill/generate`, data);
  }

  cancelEWayBill(ewayBillNo: string, reason: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/eway-bill/${ewayBillNo}/cancel`, { reason });
  }

  updateEWayBillVehicle(ewayBillNo: string, vehicleNo: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/eway-bill/${ewayBillNo}/vehicle`, { vehicleNo });
  }

  getEWayBillByInvoice(invoiceId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/eway-bill/invoice/${invoiceId}`);
  }

  checkEWayBillRequired(invoiceId: string): Observable<ApiResponse<{ required: boolean }>> {
    return this.http.get<ApiResponse<{ required: boolean }>>(`${this.base}/eway-bill/check/${invoiceId}`);
  }

  // ─── E-Invoice / IRN (Phase 2) ────────────────────────────────────────────
  generateIRN(invoiceId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/e-invoice/generate/${invoiceId}`, {});
  }

  cancelIRN(irn: string, reason: string, remarks: string = ''): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/e-invoice/${irn}/cancel`, { reason, remarks });
  }

  getEInvoiceByInvoice(invoiceId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/e-invoice/invoice/${invoiceId}`);
  }

  // ─── GSTR-9 Annual Return (Phase 2) ───────────────────────────────────────
  generateGSTR9(clientId: string, financialYear: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/gstr9/generate`, { clientId, financialYear });
  }

  downloadGSTR9(clientId: string, financialYear: string): Observable<Blob> {
    return this.http.get(`${this.base}/gstr9/download`, {
      params: new HttpParams().set('clientId', clientId).set('financialYear', financialYear),
      responseType: 'blob',
    });
  }
}
