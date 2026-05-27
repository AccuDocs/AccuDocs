import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { responseToastInterceptor } from './core/interceptors/response-toast.interceptor';
import { superAdminInterceptor } from './core/interceptors/super-admin.interceptor';
import { provideHotToastConfig } from '@ngneat/hot-toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([
      superAdminInterceptor,
      authInterceptor,
      responseToastInterceptor,
      errorInterceptor,
    ])),
    provideHotToastConfig({
      position: 'top-right',
      dismissible: true,
      duration: 4500,
      className: 'accudocs-hot-toast',
      error: {
        duration: 8000,
        className: 'accudocs-hot-toast accudocs-hot-toast-error',
      },
      success: {
        duration: 4500,
        className: 'accudocs-hot-toast accudocs-hot-toast-success',
      },
      warning: {
        duration: 5500,
        className: 'accudocs-hot-toast accudocs-hot-toast-warning',
      },
      info: {
        duration: 4500,
        className: 'accudocs-hot-toast accudocs-hot-toast-info',
      },
    }),
  ],
};
