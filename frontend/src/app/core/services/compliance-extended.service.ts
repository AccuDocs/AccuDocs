import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';
import { TdsEntry, TcsEntry, TdsSection, Form26ASSummary } from '../../features/gst-filing/models/tds-tcs.model';

@Injectable({ providedIn: 'root' })
export class ComplianceExtendedService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/compliance`;

  // ─── TDS Sections ──────────────────────────────────────────────────────────
  getTDSSections(): Observable<ApiResponse<TdsSection[]>> {
    return this.http.get<ApiResponse<TdsSection[]>>(`${this.base}/tds/sections`);
  }

  calculateTDS(amount: number, section: string, isIndividual: boolean = true): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/tds/calculate`, { amount, section, isIndividual });
  }

  // ─── TDS CRUD ──────────────────────────────────────────────────────────────
  createTDS(data: any): Observable<ApiResponse<TdsEntry>> {
    return this.http.post<ApiResponse<TdsEntry>>(`${this.base}/tds`, data);
  }

  listTDS(filters: { clientId?: string; period?: string; section?: string; status?: string } = {}): Observable<ApiResponse<TdsEntry[]>> {
    let params = new HttpParams();
    if (filters.clientId) params = params.set('clientId', filters.clientId);
    if (filters.period) params = params.set('period', filters.period);
    if (filters.section) params = params.set('section', filters.section);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<ApiResponse<TdsEntry[]>>(`${this.base}/tds`, { params });
  }

  updateTDS(id: string, data: any): Observable<ApiResponse<TdsEntry>> {
    return this.http.patch<ApiResponse<TdsEntry>>(`${this.base}/tds/${id}`, data);
  }

  deleteTDS(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tds/${id}`);
  }

  getForm26ASSummary(clientId: string, financialYear: string): Observable<ApiResponse<Form26ASSummary>> {
    return this.http.get<ApiResponse<Form26ASSummary>>(`${this.base}/tds/summary/${clientId}`, {
      params: new HttpParams().set('financialYear', financialYear),
    });
  }

  // ─── TCS CRUD ──────────────────────────────────────────────────────────────
  createTCS(data: any): Observable<ApiResponse<TcsEntry>> {
    return this.http.post<ApiResponse<TcsEntry>>(`${this.base}/tcs`, data);
  }

  listTCS(filters: { period?: string; sellerGstin?: string } = {}): Observable<ApiResponse<TcsEntry[]>> {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);
    if (filters.sellerGstin) params = params.set('sellerGstin', filters.sellerGstin);
    return this.http.get<ApiResponse<TcsEntry[]>>(`${this.base}/tcs`, { params });
  }

  updateTCS(id: string, data: any): Observable<ApiResponse<TcsEntry>> {
    return this.http.patch<ApiResponse<TcsEntry>>(`${this.base}/tcs/${id}`, data);
  }

  deleteTCS(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tcs/${id}`);
  }
}
