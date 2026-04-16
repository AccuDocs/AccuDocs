import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
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

const DEFAULT_SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: 'fallback-itr-salaried',
    name: 'ITR Filing - Salaried',
    description: 'Income tax return filing for salaried individuals',
    sacCode: '998231',
    defaultRate: 2500,
    defaultGstRate: 18,
    sortOrder: 1,
  },
  {
    id: 'fallback-itr-business',
    name: 'ITR Filing - Business',
    description: 'Income tax return filing for proprietorship and business clients',
    sacCode: '998231',
    defaultRate: 6500,
    defaultGstRate: 18,
    sortOrder: 2,
  },
  {
    id: 'fallback-gst-return',
    name: 'GST Return Filing',
    description: 'Monthly or quarterly GST return preparation and filing',
    sacCode: '998232',
    defaultRate: 3000,
    defaultGstRate: 18,
    sortOrder: 3,
  },
  {
    id: 'fallback-gst-annual',
    name: 'GST Annual Return',
    description: 'Annual GST reconciliation and return filing',
    sacCode: '998232',
    defaultRate: 7500,
    defaultGstRate: 18,
    sortOrder: 4,
  },
  {
    id: 'fallback-tds-return',
    name: 'TDS Return Filing',
    description: 'Quarterly TDS return preparation and submission',
    sacCode: '998233',
    defaultRate: 2200,
    defaultGstRate: 18,
    sortOrder: 5,
  },
  {
    id: 'fallback-tax-consultation',
    name: 'Tax Consultation',
    description: 'Tax planning and advisory consultation',
    sacCode: '998231',
    defaultRate: 4000,
    defaultGstRate: 18,
    sortOrder: 6,
  },
  {
    id: 'fallback-bookkeeping',
    name: 'Bookkeeping Support',
    description: 'Monthly bookkeeping and ledger review',
    sacCode: '998224',
    defaultRate: 5000,
    defaultGstRate: 18,
    sortOrder: 7,
  },
  {
    id: 'fallback-audit',
    name: 'Audit Support',
    description: 'Statutory or internal audit support services',
    sacCode: '998221',
    defaultRate: 15000,
    defaultGstRate: 18,
    sortOrder: 8,
  },
  {
    id: 'fallback-company-incorporation',
    name: 'Company Incorporation',
    description: 'Private limited or LLP incorporation package',
    sacCode: '998213',
    defaultRate: 12000,
    defaultGstRate: 18,
    sortOrder: 9,
  },
  {
    id: 'fallback-roc-filing',
    name: 'ROC Filing',
    description: 'Annual ROC forms and secretarial compliance',
    sacCode: '998214',
    defaultRate: 4500,
    defaultGstRate: 18,
    sortOrder: 10,
  },
  {
    id: 'fallback-payroll',
    name: 'Payroll Processing',
    description: 'Monthly payroll, PF, and ESIC support',
    sacCode: '998311',
    defaultRate: 3500,
    defaultGstRate: 18,
    sortOrder: 11,
  },
  {
    id: 'fallback-certification',
    name: 'Certification Work',
    description: 'CA certificate and verification services',
    sacCode: '998299',
    defaultRate: 5000,
    defaultGstRate: 18,
    sortOrder: 12,
  },
];

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private http = inject(HttpClient);
  private httpBackend = inject(HttpBackend);
  private rawHttp = new HttpClient(this.httpBackend);
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

  /** Convert proforma → tax invoice */
  convertToTax(id: string): Observable<ApiResponse<{ id: string; invoiceNumber: string }>> {
    return this.http.post<ApiResponse<{ id: string; invoiceNumber: string }>>(`${this.base}/invoices/${id}/convert-to-tax`, {});
  }

  /** Generate a shareable payment link for an invoice */
  generatePaymentLink(id: string): Observable<ApiResponse<{ url: string; expiresAt: string }>> {
    return this.http.post<ApiResponse<{ url: string; expiresAt: string }>>(`${this.base}/invoices/${id}/payment-link`, {});
  }

  /** Generate PDF using a specific template (POST) */
  generatePdfWithTemplate(invoiceId: string, templateId?: string): Observable<Blob> {
    const url = `${this.base}/invoices/${invoiceId}/pdf${templateId ? `?template_id=${templateId}` : ''}`;
    return this.http.post(url, {}, { responseType: 'blob' });
  }

  /** List all invoice templates (system + org-specific) */
  getTemplates(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/templates`);
  }

  /** Set a template as org default */
  setDefaultTemplate(templateId: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.base}/templates/${templateId}/set-default`, {});
  }

  getPdfUrl(id: string): Observable<ApiResponse<{ url: string }>> {
    return this.http.get<ApiResponse<{ url: string }>>(`${this.base}/invoices/${id}/pdf`);
  }

  getMetrics(): Observable<ApiResponse<BillingMetrics>> {
    return this.http.get<ApiResponse<BillingMetrics>>(`${this.base}/metrics`);
  }

  getServiceTemplates(): Observable<ApiResponse<ServiceTemplate[]>> {
    return this.rawHttp.get<ApiResponse<ServiceTemplate[]>>(`${this.base}/service-templates`).pipe(
      catchError(() =>
        of({
          success: true,
          message: 'Using fallback service templates',
          data: DEFAULT_SERVICE_TEMPLATES,
        })
      )
    );
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
