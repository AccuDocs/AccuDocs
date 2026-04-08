import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface SaleEntry {
  id: string;
  clientId: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  month: number;
  financialYear: string;
  createdAt: string;
}

export interface PurchaseEntry {
  id: string;
  clientId: string;
  billNo: string;
  billDate: string;
  vendorName: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  month: number;
  financialYear: string;
  createdAt: string;
}

export interface ExpenseEntry {
  id: string;
  clientId: string;
  expenseDate: string;
  category: string;
  description: string;
  vendorName?: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  month: number;
  financialYear: string;
  createdAt: string;
}

export interface GstSummaryRow {
  client_id: string;
  month: number;
  financial_year: string;
  total_sales: number;
  output_gst: number;
  total_purchases: number;
  input_gst: number;
  gst_payable: number;
  total_expenses: number;
}

export interface UploadResult {
  imported: number;
  failed: number;
  errors: { row: number; field: string; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/clients`;

  // ===================== SALES =====================
  getSales(clientId: string, month?: number, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/sales`, { params });
  }

  createSale(clientId: string, data: Partial<SaleEntry>): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/sales`, data);
  }

  updateSale(clientId: string, saleId: string, data: Partial<SaleEntry>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${clientId}/sales/${saleId}`, data);
  }

  deleteSale(clientId: string, saleId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clientId}/sales/${saleId}`);
  }

  uploadSales(clientId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${clientId}/sales/upload`, formData);
  }

  // ===================== PURCHASES =====================
  getPurchases(clientId: string, month?: number, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/purchases`, { params });
  }

  createPurchase(clientId: string, data: Partial<PurchaseEntry>): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/purchases`, data);
  }

  updatePurchase(clientId: string, purchaseId: string, data: Partial<PurchaseEntry>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${clientId}/purchases/${purchaseId}`, data);
  }

  deletePurchase(clientId: string, purchaseId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clientId}/purchases/${purchaseId}`);
  }

  uploadPurchases(clientId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${clientId}/purchases/upload`, formData);
  }

  // ===================== EXPENSES =====================
  getExpenses(clientId: string, month?: number, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/expenses`, { params });
  }

  createExpense(clientId: string, data: Partial<ExpenseEntry>): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/expenses`, data);
  }

  updateExpense(clientId: string, expenseId: string, data: Partial<ExpenseEntry>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${clientId}/expenses/${expenseId}`, data);
  }

  deleteExpense(clientId: string, expenseId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clientId}/expenses/${expenseId}`);
  }

  // ===================== GST SUMMARY =====================
  getGstSummary(clientId: string, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/gst-summary`, { params });
  }
}
