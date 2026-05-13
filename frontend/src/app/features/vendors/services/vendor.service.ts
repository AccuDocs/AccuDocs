import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse, PaginatedApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';
import {
  AccountsPayableRow,
  Vendor,
  VendorBill,
  VendorDashboard,
  VendorDocument,
  VendorPayment,
  VendorPurchaseOrder,
} from '../models/vendor.models';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/vendors`;

  getDashboard(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<VendorDashboard>>(`${this.base}/dashboard`, { params: this.params(params) });
  }

  getVendors(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<PaginatedApiResponse<Vendor>>(`${this.base}`, { params: this.params(params) });
  }

  getVendor(id: string, params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<Vendor>>(`${this.base}/${id}`, { params: this.params(params) });
  }

  createVendor(payload: Partial<Vendor>) {
    return this.http.post<ApiResponse<Vendor>>(`${this.base}`, payload);
  }

  updateVendor(id: string, payload: Partial<Vendor>) {
    return this.http.put<ApiResponse<Vendor>>(`${this.base}/${id}`, payload);
  }

  deleteVendor(id: string, params: Record<string, string | number | undefined> = {}) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`, { params: this.params(params) });
  }

  getPurchaseOrders(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<VendorPurchaseOrder[]>>(`${this.base}/purchase-orders/list/all`, { params: this.params(params) });
  }

  createPurchaseOrder(payload: Record<string, unknown>) {
    return this.http.post<ApiResponse<VendorPurchaseOrder>>(`${this.base}/purchase-orders`, payload);
  }

  updatePurchaseOrderStatus(id: string, status: string) {
    return this.http.patch<ApiResponse<VendorPurchaseOrder>>(`${this.base}/purchase-orders/${id}/status`, { status });
  }

  getBills(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<VendorBill[]>>(`${this.base}/bills/list/all`, { params: this.params(params) });
  }

  createBill(payload: Record<string, unknown>) {
    return this.http.post<ApiResponse<VendorBill>>(`${this.base}/bills`, payload);
  }

  getPayments(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<VendorPayment[]>>(`${this.base}/payments/list/all`, { params: this.params(params) });
  }

  createPayment(payload: Record<string, unknown>) {
    return this.http.post<ApiResponse<VendorPayment[]>>(`${this.base}/payments`, payload);
  }

  getAccountsPayable(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<AccountsPayableRow[]>>(`${this.base}/accounts-payable`, { params: this.params(params) });
  }

  getDocuments(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<ApiResponse<VendorDocument[]>>(`${this.base}/documents/list/all`, { params: this.params(params) });
  }

  createDocument(payload: Record<string, unknown>) {
    return this.http.post<ApiResponse<VendorDocument>>(`${this.base}/documents`, payload);
  }

  private params(values: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
