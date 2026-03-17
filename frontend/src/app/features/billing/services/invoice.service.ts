import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';
import {
  CreateInvoiceDto,
  Invoice,
  InvoiceListParams,
  InvoiceMutationResponse,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from '../models/invoice.model';
import { BillingMetrics } from '../models/billing-metrics.model';
import {
  CreateRecurringDto,
  RecurringTemplate,
  RecurringTemplateListParams,
  UpdateRecurringDto,
} from '../models/recurring-template.model';
import { ServiceTemplate } from '../models/service-template.model';
import { Payment } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/billing`;

  getInvoices(params: InvoiceListParams = {}): Observable<PaginatedApiResponse<Invoice>> {
    return this.http.get<PaginatedApiResponse<Invoice>>(`${this.base}/invoices`, {
      params: this.toHttpParams(params),
    });
  }

  getInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.base}/invoices/${id}`);
  }

  createInvoice(dto: CreateInvoiceDto): Observable<ApiResponse<InvoiceMutationResponse>> {
    return this.http.post<ApiResponse<InvoiceMutationResponse>>(`${this.base}/invoices`, dto);
  }

  updateInvoice(id: string, dto: UpdateInvoiceDto): Observable<ApiResponse<Invoice>> {
    return this.http.put<ApiResponse<Invoice>>(`${this.base}/invoices/${id}`, dto);
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invoices/${id}`);
  }

  issueInvoice(id: string): Observable<ApiResponse<{ status: string }>> {
    return this.http.patch<ApiResponse<{ status: string }>>(`${this.base}/invoices/${id}/status`, {
      status: 'issued',
    });
  }

  cancelInvoice(id: string, reason: string): Observable<ApiResponse<{ status: string }>> {
    return this.http.patch<ApiResponse<{ status: string }>>(`${this.base}/invoices/${id}/status`, {
      status: 'cancelled',
      cancelReason: reason,
    });
  }

  recordPayment(id: string, dto: RecordPaymentDto): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${this.base}/invoices/${id}/record-payment`, dto);
  }

  sendWhatsApp(id: string): Observable<ApiResponse<{ sent: boolean }>> {
    return this.http.post<ApiResponse<{ sent: boolean }>>(`${this.base}/invoices/${id}/send-whatsapp`, {});
  }

  getPdfUrl(id: string): Observable<ApiResponse<{ url: string }>> {
    return this.http.get<ApiResponse<{ url: string }>>(`${this.base}/invoices/${id}/pdf`);
  }

  getMetrics(): Observable<ApiResponse<BillingMetrics>> {
    return this.http.get<ApiResponse<BillingMetrics>>(`${this.base}/metrics`);
  }

  getServiceTemplates(): Observable<ApiResponse<ServiceTemplate[]>> {
    return this.http.get<ApiResponse<ServiceTemplate[]>>(`${this.base}/service-templates`);
  }

  getRecurringTemplates(
    params: RecurringTemplateListParams = {}
  ): Observable<ApiResponse<RecurringTemplate[]>> {
    return this.http.get<ApiResponse<RecurringTemplate[]>>(`${this.base}/recurring-templates`, {
      params: this.toHttpParams(params),
    });
  }

  createRecurringTemplate(dto: CreateRecurringDto): Observable<ApiResponse<RecurringTemplate>> {
    return this.http.post<ApiResponse<RecurringTemplate>>(`${this.base}/recurring-templates`, dto);
  }

  updateRecurringTemplate(
    id: string,
    dto: UpdateRecurringDto
  ): Observable<ApiResponse<RecurringTemplate>> {
    return this.http.patch<ApiResponse<RecurringTemplate>>(`${this.base}/recurring-templates/${id}`, dto);
  }

  toggleRecurring(id: string): Observable<ApiResponse<RecurringTemplate>> {
    return this.http.patch<ApiResponse<RecurringTemplate>>(`${this.base}/recurring-templates/${id}/toggle`, {});
  }

  deleteRecurring(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/recurring-templates/${id}`);
  }

  private toHttpParams(params: object): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(
      params as Record<string, string | number | boolean | null | undefined>
    )) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
