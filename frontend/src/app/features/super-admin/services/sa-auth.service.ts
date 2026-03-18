import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { 
  SuperAdmin, 
  LoginRequest, 
  LoginResponse, 
  ApiResponse 
} from '../models/sa.models';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/super-admin`;

  // Signals
  private _admin = signal<SuperAdmin | null>(null);
  private _token = signal<string | null>(localStorage.getItem('sa_token'));
  
  // Selectors
  readonly admin = this._admin.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentAdmin = computed(() => this._admin());

  constructor() {
    this.initialiseAuth();
  }

  private initialiseAuth(): void {
    const storedAdmin = localStorage.getItem('sa_admin');
    if (storedAdmin && this._token()) {
      try {
        this._admin.set(JSON.parse(storedAdmin));
      } catch (e) {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuth(response.data);
        }
      })
    );
  }

  logout(): void {
    // We call logout endpoint if needed, but primarily clear local state
    this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      catchError(() => of(null)) // Ignore error on logout
    ).subscribe();

    this.clearAuth();
    this.router.navigate(['/super-admin/login']);
  }

  getToken(): string | null {
    return this._token();
  }

  private setAuth(data: LoginResponse): void {
    localStorage.setItem('sa_token', data.accessToken);
    localStorage.setItem('sa_admin', JSON.stringify(data.admin));
    this._token.set(data.accessToken);
    this._admin.set(data.admin);
  }

  private clearAuth(): void {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_admin');
    this._token.set(null);
    this._admin.set(null);
  }

  refreshToken(): Observable<ApiResponse<{ accessToken: string }>> {
    return this.http.post<ApiResponse<{ accessToken: string }>>(`${this.baseUrl}/auth/refresh`, {}).pipe(
      tap(response => {
        if (response.success && response.data) {
          localStorage.setItem('sa_token', response.data.accessToken);
          this._token.set(response.data.accessToken);
        }
      })
    );
  }
}
