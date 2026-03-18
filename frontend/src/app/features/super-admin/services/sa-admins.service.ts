import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  SuperAdmin, 
  ApiResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SAAdminsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/admins`;

  getSuperAdmins(): Observable<ApiResponse<SuperAdmin[]>> {
    return this.http.get<ApiResponse<SuperAdmin[]>>(this.baseUrl);
  }

  createSuperAdmin(data: any): Observable<ApiResponse<SuperAdmin>> {
    return this.http.post<ApiResponse<SuperAdmin>>(this.baseUrl, data);
  }

  updateSuperAdmin(id: string, data: any): Observable<ApiResponse<SuperAdmin>> {
    return this.http.patch<ApiResponse<SuperAdmin>>(`${this.baseUrl}/${id}`, data);
  }

  changePassword(id: string, data: any): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/change-password`, data);
  }

  deleteSuperAdmin(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
