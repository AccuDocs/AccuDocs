import { Routes } from '@angular/router';

export const GST_FILING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/gst-dashboard/gst-dashboard.component').then(m => m.GstDashboardComponent)
  },
  {
    path: 'gstr1/:id',
    loadComponent: () => import('./components/gstr1-form/gstr1-form.component').then(m => m.Gstr1FormComponent)
  },
  {
    path: 'gstr1/new',
    loadComponent: () => import('./components/gstr1-form/gstr1-form.component').then(m => m.Gstr1FormComponent)
  },
  {
    path: 'gstr3b/:id',
    loadComponent: () => import('./components/gstr3b-form/gstr3b-form.component').then(m => m.Gstr3bFormComponent)
  },
  {
    path: 'gstr3b/new',
    loadComponent: () => import('./components/gstr3b-form/gstr3b-form.component').then(m => m.Gstr3bFormComponent)
  }
];
