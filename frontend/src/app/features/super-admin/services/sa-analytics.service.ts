import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { 
  PlatformAnalytics, 
  RevenueData, 
  ApiResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SAAnalyticsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/super-admin/analytics`;

  getPlatformAnalytics(): Observable<ApiResponse<PlatformAnalytics>> {
    return this.http.get<ApiResponse<PlatformAnalytics>>(`${this.baseUrl}/overview`);
  }

  getOrgMetrics(params: { from_date?: string; to_date?: string }): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams();
    if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
    if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/org-metrics`, { params: httpParams });
  }

  getRevenue(period: string, year: number): Observable<ApiResponse<RevenueData>> {
    return this.http.get<ApiResponse<RevenueData>>(`${this.baseUrl}/revenue`, {
      params: new HttpParams().set('period', period).set('year', year.toString())
    });
  }

  getGrowth(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/growth`);
  }
}
