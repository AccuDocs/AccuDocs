import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  Subscription, 
  ApiResponse, 
  PaginatedResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SASubscriptionsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/subscriptions`;

  getSubscriptions(params: any): Observable<PaginatedResponse<Subscription>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<Subscription>>(this.baseUrl, { params: httpParams });
  }

  getSubscriptionById(id: string): Observable<ApiResponse<Subscription>> {
    return this.http.get<ApiResponse<Subscription>>(`${this.baseUrl}/${id}`);
  }

  assignPlan(data: { 
    organization_id: string; 
    plan: string; 
    billing_cycle: string; 
    amount: number;
    max_clients: number;
    max_users: number;
  }): Observable<ApiResponse<Subscription>> {
    return this.http.post<ApiResponse<Subscription>>(`${this.baseUrl}/assign`, data);
  }

  extendSubscription(id: string, extendDays: number, reason: string): Observable<ApiResponse<Subscription>> {
    return this.http.post<ApiResponse<Subscription>>(`${this.baseUrl}/${id}/extend`, { extendDays, reason });
  }

  cancelSubscription(id: string, reason: string, cancelAtPeriodEnd: boolean): Observable<ApiResponse<Subscription>> {
    return this.http.post<ApiResponse<Subscription>>(`${this.baseUrl}/${id}/cancel`, { reason, cancelAtPeriodEnd });
  }
}
