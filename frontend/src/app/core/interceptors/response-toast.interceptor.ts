import { HttpContextToken, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { extractBackendSuccessMessage } from '../utils/api-message.util';

export const SKIP_RESPONSE_TOAST = new HttpContextToken<boolean>(() => false);

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const responseToastInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    tap((event) => {
      if (req.context.get(SKIP_RESPONSE_TOAST) || !MUTATING_METHODS.has(req.method.toUpperCase())) {
        return;
      }

      if (!(event instanceof HttpResponse) || event.status === 204) {
        return;
      }

      const message = extractBackendSuccessMessage(event.body);
      if (message) {
        toast.success(message);
      }
    })
  );
};
