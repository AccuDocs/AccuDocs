import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  ApiResponse, 
  PaginatedResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SAAnnouncementsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/announcements`;

  broadcast(data: { 
    title: string; 
    message: string; 
    target_type: 'all' | 'specific_orgs' | 'plan_based';
    target_ids?: string[];
    priority: 'low' | 'medium' | 'high';
  }): Observable<ApiResponse<{ broadcast_id: string; orgs_targeted: number; notifications_created: number }>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  getHistory(params: any): Observable<PaginatedResponse<any>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/history`, { params: httpParams });
  }
}
