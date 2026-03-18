import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SuperAdminAuthService } from '../services/sa-auth.service';

export const superAdminAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(SuperAdminAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting
  return router.createUrlTree(['/super-admin/login'], {
    queryParams: { returnUrl: state.url }
  });
};
