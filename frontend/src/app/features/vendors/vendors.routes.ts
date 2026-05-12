import { Routes } from '@angular/router';
import { VendorManagementComponent } from './vendor-management/vendor-management.component';

export const VENDORS_ROUTES: Routes = [
  { path: '', component: VendorManagementComponent, data: { view: 'list' } },
  { path: 'add', component: VendorManagementComponent, data: { view: 'add' } },
  { path: 'purchase-orders', component: VendorManagementComponent, data: { view: 'purchase-orders' } },
  { path: 'bills', component: VendorManagementComponent, data: { view: 'bills' } },
  { path: 'payments', component: VendorManagementComponent, data: { view: 'payments' } },
  { path: 'accounts-payable', component: VendorManagementComponent, data: { view: 'accounts-payable' } },
  { path: 'documents', component: VendorManagementComponent, data: { view: 'documents' } },
  { path: 'reports', component: VendorManagementComponent, data: { view: 'reports' } },
];
