import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  AuditLog, 
  PaginatedResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SAAuditLogsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/audit-logs`;

  getAuditLogs(params: any): Observable<PaginatedResponse<AuditLog>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<AuditLog>>(this.baseUrl, { params: httpParams });
  }

  exportAuditLogs(params: any, format: 'csv' | 'json'): Observable<Blob> {
    let httpParams = new HttpParams().set('format', format);
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get(`${this.baseUrl}/export`, { 
      params: httpParams, 
      responseType: 'blob' 
    });
  }
}
