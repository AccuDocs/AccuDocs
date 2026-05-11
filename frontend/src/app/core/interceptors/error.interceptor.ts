import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { extractBackendErrorMessage } from '../utils/api-message.util';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = isAuthenticationEndpoint(req.url);
      const isSuperAdminRequest = req.url.includes('/super-admin');
      let errorMessage = extractBackendErrorMessage(error.error);

      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message;
      } else if (!errorMessage || errorMessage === 'An error occurred') {
        switch (error.status) {
          case 400:
            errorMessage = 'Bad request';
            break;
          case 401:
            errorMessage = 'Session expired. Please login again.';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 422:
            errorMessage = 'Validation failed';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.message || 'An error occurred';
        }
      }

      if (error.status === 401 && !isAuthEndpoint && !isSuperAdminRequest) {
        authService.logout();
      }

      toast.error(errorMessage);

      return throwError(() => withBackendMessage(error, errorMessage));
    })
  );
};

function isAuthenticationEndpoint(url: string): boolean {
  return /\/auth\/(admin-login|login|logout|refresh|refresh-token|send-otp|verify-otp)/.test(url);
}

function withBackendMessage(error: HttpErrorResponse, message: string): HttpErrorResponse {
  const enrichedError = error as HttpErrorResponse & { userMessage?: string };
  enrichedError.userMessage = message;

  try {
    Object.defineProperty(enrichedError, 'message', {
      value: message,
      configurable: true,
    });
  } catch {
    // HttpErrorResponse.message is readonly in TypeScript; keep userMessage as fallback.
  }

  if (enrichedError.error && typeof enrichedError.error === 'object' && !('message' in enrichedError.error)) {
    try {
      Object.defineProperty(enrichedError.error, 'message', {
        value: message,
        configurable: true,
      });
    } catch {
      // Some payloads are not extensible; userMessage/message still carry the display text.
    }
  }

  return enrichedError;
}
