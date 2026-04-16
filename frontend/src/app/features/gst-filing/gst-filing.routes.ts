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
  },
  {
    path: 'hsn-directory',
    title: 'HSN / SAC Directory — AccuDocs',
    loadComponent: () => import('./components/hsn-directory/hsn-directory.component').then(m => m.HsnDirectoryComponent)
  },
  {
    path: 'itc-tracker',
    title: 'ITC Tracker — AccuDocs',
    loadComponent: () => import('./components/itc-tracker/itc-tracker.component').then(m => m.ItcTrackerComponent)
  },
  {
    path: 'gstr2a-reconcile',
    title: 'GSTR-2A Reconciliation — AccuDocs',
    loadComponent: () => import('./components/gstr2a-reconcile/gstr2a-reconcile.component').then(m => m.Gstr2aReconcileComponent)
  }
];
