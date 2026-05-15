import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

const ledgerPage = () =>
  import('./pages/sub-ledger-page.component').then((module) => module.SubLedgerPageComponent);

export const SUB_LEDGER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'dashboard' },
  },
  {
    path: 'customers',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'customers' },
  },
  {
    path: 'vendors',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'vendors' },
  },
  {
    path: 'inventory',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'inventory' },
  },
  {
    path: 'employees',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'employees' },
  },
  {
    path: 'tax',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'tax' },
  },
  {
    path: 'bank',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'bank' },
  },
  {
    path: 'outstanding',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'outstanding' },
  },
  {
    path: 'reports',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'reports' },
  },
  {
    path: 'audit-logs',
    loadComponent: ledgerPage,
    canActivate: [roleGuard],
    data: { roles: ['admin', 'accountant'], section: 'audit-logs' },
  },
];
