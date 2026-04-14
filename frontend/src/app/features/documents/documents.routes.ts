import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./documents-list/documents-list.component').then((m) => m.DocumentsListComponent),
  },
  {
    path: 'scanner',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'scanner/all',
    loadComponent: () =>
      import('../document-scanner/components/scanner-documents-list.component').then((m) => m.ScannerDocumentsListComponent),
  },
];
