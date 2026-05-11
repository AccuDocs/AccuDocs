import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const billingRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'firm',
  },
  {
    path: 'firm',
    loadComponent: () =>
      import('./components/billing-dashboard/billing-dashboard.component').then(
        (module) => module.BillingDashboardComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager', 'invoicing_officer'] },
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./components/invoice-list/invoice-list.component').then((module) => module.InvoiceListComponent),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager', 'invoicing_officer'] },
  },
  {
    path: 'invoices/new',
    loadComponent: () =>
      import('./components/invoice-form/invoice-form.component').then((module) => module.InvoiceFormComponent),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager', 'invoicing_officer'] },
  },
  {
    path: 'invoices/:id',
    loadComponent: () =>
      import('./components/invoice-detail/invoice-detail.component').then(
        (module) => module.InvoiceDetailComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager', 'invoicing_officer'] },
  },
  {
    path: 'invoices/:id/edit',
    loadComponent: () =>
      import('./components/invoice-form/invoice-form.component').then((module) => module.InvoiceFormComponent),
    canActivate: [roleGuard],
    data: {
      roles: ['admin', 'finance_manager', 'invoicing_officer'],
      editMode: true,
    },
  },
  {
    path: 'recurring',
    loadComponent: () =>
      import('./components/recurring-list/recurring-list.component').then(
        (module) => module.RecurringListComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager'] },
  },
  {
    path: 'bulk-generate',
    loadComponent: () =>
      import('./components/bulk-generate/bulk-generate.component').then(
        (module) => module.BulkGenerateComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['admin', 'finance_manager'] },
  },
];

export const BILLING_ROUTES = billingRoutes;
