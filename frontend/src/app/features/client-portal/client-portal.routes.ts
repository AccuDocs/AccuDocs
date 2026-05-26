import { Routes } from '@angular/router';

export const CLIENT_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./client-portal.component').then((m) => m.ClientPortalComponent),
  },
];
