import { Routes } from '@angular/router';
import { VendorManagementComponent } from './vendor-management/vendor-management.component';

export const VENDORS_ROUTES: Routes = [
  { path: '', component: VendorManagementComponent, data: { view: 'list' } },
  { path: 'vendors', component: VendorManagementComponent, data: { view: 'list' } },
  { path: 'vendors/add', component: VendorManagementComponent, data: { view: 'add' } },
  { path: 'add', component: VendorManagementComponent, data: { view: 'add' } },
  { path: 'expenses', component: VendorManagementComponent, data: { view: 'expenses' } },
  { path: 'recurring-expenses', component: VendorManagementComponent, data: { view: 'recurring-expenses' } },
  { path: 'purchase-orders', component: VendorManagementComponent, data: { view: 'purchase-orders' } },
  { path: 'bills', component: VendorManagementComponent, data: { view: 'bills' } },
  { path: 'recurring-bills', component: VendorManagementComponent, data: { view: 'recurring-bills' } },
  { path: 'payments-made', component: VendorManagementComponent, data: { view: 'payments' } },
  { path: 'payments', component: VendorManagementComponent, data: { view: 'payments' } },
  { path: 'vendor-credits', component: VendorManagementComponent, data: { view: 'vendor-credits' } },
  { path: 'accounts-payable', component: VendorManagementComponent, data: { view: 'accounts-payable' } },
  { path: 'documents', component: VendorManagementComponent, data: { view: 'documents' } },
  { path: 'reports', component: VendorManagementComponent, data: { view: 'reports' } },
];
