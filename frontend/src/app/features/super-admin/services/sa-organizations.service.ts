import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  Organization, 
  ApiResponse, 
  PaginatedResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SAOrganizationsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/organizations`;

  getOrganizations(params: any): Observable<PaginatedResponse<Organization>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<Organization>>(this.baseUrl, { params: httpParams });
  }

  getOrganization(id: string): Observable<ApiResponse<Organization>> {
    return this.http.get<ApiResponse<Organization>>(`${this.baseUrl}/${id}`);
  }

  createOrganization(data: any): Observable<ApiResponse<{ org: Organization; adminUser: any }>> {
    return this.http.post<ApiResponse<{ org: Organization; adminUser: any }>>(this.baseUrl, data);
  }

  updateOrganization(id: string, data: Partial<Organization>): Observable<ApiResponse<Organization>> {
    return this.http.patch<ApiResponse<Organization>>(`${this.baseUrl}/${id}`, data);
  }

  suspendOrganization(id: string, reason?: string): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(`${this.baseUrl}/${id}/suspend`, { reason });
  }

  activateOrganization(id: string): Observable<ApiResponse<Organization>> {
    return this.http.post<ApiResponse<Organization>>(`${this.baseUrl}/${id}/activate`, {});
  }

  deleteOrganization(id: string, confirmSlug: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`, { body: { confirmSlug } });
  }

  impersonate(id: string): Observable<ApiResponse<{
    impersonationToken: string;
    expiresAt: string;
    org: Organization;
    adminUser: any;
    url: string;
  }>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/impersonate`, {});
  }
}
