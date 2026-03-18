import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SuperAdminAuthService } from '../../features/super-admin/services/sa-auth.service';

export const superAdminInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(SuperAdminAuthService);
  const token = authService.getToken();

  // Only intercept requests to the super-admin API
  if (req.url.includes('/super-admin') && token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't trigger logout if the request that failed WAS a login/logout/refresh request
      const isAuthRequest = req.url.includes('/auth/login') || 
                            req.url.includes('/auth/logout') || 
                            req.url.includes('/auth/refresh');

      if (error.status === 401 && req.url.includes('/super-admin') && !isAuthRequest) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
