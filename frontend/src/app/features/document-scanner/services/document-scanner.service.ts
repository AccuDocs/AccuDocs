import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ClientScannerSaveResponse,
  PreviewResponse,
  SaveResponse,
  ScannedDocumentsResponse,
  ScannerDocumentData,
  ScannerListFilters,
  SingleDocumentResponse,
} from '../models/document-scanner.models';

@Injectable({
  providedIn: 'root',
})
export class DocumentScannerService {
  private http = inject(HttpClient);
  private apiRoot = environment.apiUrl.replace(/\/api\/v\d+$/, '');
  private scanBaseUrl = `${this.apiRoot}/api/scan`;
  private documentsBaseUrl = `${this.apiRoot}/api/documents`;
  private exportBaseUrl = `${this.apiRoot}/api/export`;
  private clientBaseUrl = `${environment.apiUrl}/clients`;

  previewDocument(file: File, docType: ScannerDocumentData['doc_type']): Observable<PreviewResponse> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('doc_type', docType);

    return this.http.post<PreviewResponse>(`${this.scanBaseUrl}/preview`, formData);
  }

  saveDocument(file: File, payload: ScannerDocumentData): Observable<SaveResponse> {
    return this.http.post<SaveResponse>(`${this.scanBaseUrl}/save`, this.buildDocumentFormData(file, payload));
  }

  saveDocumentForClient(
    clientId: string,
    file: File,
    payload: ScannerDocumentData,
  ): Observable<ClientScannerSaveResponse> {
    return this.http.post<ClientScannerSaveResponse>(
      `${this.clientBaseUrl}/${clientId}/scanner/import`,
      this.buildDocumentFormData(file, payload),
    );
  }

  getDocuments(filters: ScannerListFilters = {}): Observable<ScannedDocumentsResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page || 1))
      .set('limit', String(filters.limit || 20));

    if (filters.type) params = params.set('type', filters.type);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.vendor) params = params.set('vendor', filters.vendor);

    return this.http.get<ScannedDocumentsResponse>(this.documentsBaseUrl, { params });
  }

  getDocument(documentId: number): Observable<SingleDocumentResponse> {
    return this.http.get<SingleDocumentResponse>(`${this.documentsBaseUrl}/${documentId}`);
  }

  updateDocument(documentId: number, payload: Partial<ScannerDocumentData>): Observable<SingleDocumentResponse> {
    return this.http.put<SingleDocumentResponse>(`${this.documentsBaseUrl}/${documentId}`, payload);
  }

  deleteDocument(documentId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.documentsBaseUrl}/${documentId}`);
  }

  exportExcel(filters: ScannerListFilters = {}): Observable<Blob> {
    return this.http.get(this.buildExportUrl('excel', filters), {
      responseType: 'blob',
    });
  }

  exportCsv(filters: ScannerListFilters = {}): Observable<Blob> {
    return this.http.get(this.buildExportUrl('csv', filters), {
      responseType: 'blob',
    });
  }

  private buildExportUrl(format: 'excel' | 'csv', filters: ScannerListFilters): string {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.vendor) params.set('vendor', filters.vendor);

    const query = params.toString();
    return `${this.exportBaseUrl}/${format}${query ? `?${query}` : ''}`;
  }

  private buildDocumentFormData(file: File, payload: ScannerDocumentData): FormData {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('doc_type', payload.doc_type);
    formData.append('document_number', payload.document_number || '');
    formData.append('date', payload.date || '');
    formData.append('vendor_or_customer', payload.vendor_or_customer || '');
    formData.append('gstin', payload.gstin || '');
    formData.append('subtotal', payload.subtotal?.toString() || '');
    formData.append('tax_amount', payload.tax_amount?.toString() || '');
    formData.append('discount', payload.discount?.toString() || '');
    formData.append('total_amount', payload.total_amount?.toString() || '');
    formData.append('currency', payload.currency || 'INR');
    formData.append('payment_mode', payload.payment_mode || '');
    formData.append('notes', payload.notes || '');
    formData.append('email', payload.email || '');
    formData.append('phone', payload.phone || '');
    formData.append('ocr_confidence', payload.ocr_confidence?.toString() || '');
    formData.append('raw_ocr_text', payload.raw_ocr_text || '');
    formData.append('line_items', JSON.stringify(payload.line_items || []));
    return formData;
  }
}
