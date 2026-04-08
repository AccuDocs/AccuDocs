import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GstService {
  private apiUrl = `${environment.apiUrl}/gst`;

  constructor(private http: HttpClient) {}

  generateDraft(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/draft`, payload);
  }

  getReturnsByClient(clientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/client/${clientId}`);
  }

  getReturnById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateReturn(id: string, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  deleteReturn(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  exportJson(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/export-json`);
  }

  downloadJson(id: string, fileName: string): void {
    this.exportJson(id).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  saveToWorkspace(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/save-to-workspace`, {});
  }
}
