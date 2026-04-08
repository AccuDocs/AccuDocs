import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// ===================== V2 INTERFACES =====================

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
  // V2
  gstin?: string;
  invoiceType: string;
  placeOfSupply?: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  isNilRated: boolean;
  isAdvance: boolean;
  status: string;
  notes?: string;
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
  // V2
  gstin?: string;
  purchaseType: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  itcEligible: boolean;
  rcmApplicable: boolean;
  isCapitalGoods: boolean;
  status: string;
  notes?: string;
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
  // V2
  gstApplicable: boolean;
  gstRate: number;
  gstAmount: number;
  itcAllowed: boolean;
  itcBlockedReason?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface GstSummaryRow {
  client_id: string;
  month: number;
  financial_year: string;
  total_sales: number;
  output_gst: number;
  output_cgst: number;
  output_sgst: number;
  output_igst: number;
  total_purchases: number;
  input_gst: number;
  input_cgst: number;
  input_sgst: number;
  input_igst: number;
  gst_payable: number;
  total_expenses: number;
  expense_gst: number;
  expense_itc: number;
}

export interface DashboardSummary {
  client: {
    id: string;
    name: string;
    businessName: string;
    gstin: string;
    stateCode: string;
  };
  financialYear: string;
  month?: number;
  cards: {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    outputGST: number;
    inputITC: number;
    blockedITC: number;
    rcmLiability: number;
    netGSTPayable: number;
  };
  salesBreakdown: {
    count: number;
    b2b: { count: number; value: number };
    b2c: { count: number; value: number };
    export: { count: number; value: number };
  };
  purchasesBreakdown: {
    count: number;
    itcEligible: { count: number; value: number };
    itcBlocked: { count: number; value: number };
    rcm: { count: number; value: number };
  };
  expensesBreakdown: {
    count: number;
    gstApplicable: number;
    nonGst: number;
    itcBlocked: number;
  };
  taxSplit: { cgst: number; sgst: number; igst: number };
  validationErrorCount: number;
}

export interface AnalyticsMonth {
  month: number;
  totalSales: number;
  outputGST: number;
  outputCGST: number;
  outputSGST: number;
  outputIGST: number;
  totalPurchases: number;
  inputGST: number;
  inputCGST: number;
  inputSGST: number;
  inputIGST: number;
  gstPayable: number;
  totalExpenses: number;
  expenseGST: number;
  expenseITC: number;
}

export interface GstReturnEntry {
  id: string;
  returnType: string;
  periodMonth: number;
  periodYear: number;
  financialYear: string;
  status: string;
  dueDate: string;
  filedDate: string;
  arn: string;
  remarks: string;
}

export interface ValidationAlert {
  id: string;
  errorCategory: string;
  errorType: string;
  severity: string;
  message: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  isResolved: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
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

  uploadExpenses(clientId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${clientId}/expenses/upload`, formData);
  }

  // ===================== GST SUMMARY =====================
  getGstSummary(clientId: string, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/gst-summary`, { params });
  }

  // ===================== DASHBOARD V2 =====================
  getDashboardSummary(clientId: string, financialYear?: string, month?: number): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    if (month) params = params.set('month', month.toString());
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/summary`, { params });
  }

  getDashboardAnalytics(clientId: string, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/analytics`, { params });
  }

  getReturnStatus(clientId: string, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/return-status`, { params });
  }

  getAlerts(clientId: string, financialYear?: string): Observable<any> {
    let params = new HttpParams();
    if (financialYear) params = params.set('financial_year', financialYear);
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/alerts`, { params });
  }

  getActivity(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/activity`);
  }

  getUploadStatus(clientId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${clientId}/dashboard/upload-status`);
  }

  // ===================== GST ACTIONS =====================
  computeGST(clientId: string, financialYear: string, month?: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/compute-gst`, { financial_year: financialYear, month });
  }

  validateTransactions(clientId: string, financialYear: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/validate`, { financial_year: financialYear });
  }

  saveGstReturn(clientId: string, data: Partial<GstReturnEntry>): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clientId}/gst-returns`, data);
  }
}
