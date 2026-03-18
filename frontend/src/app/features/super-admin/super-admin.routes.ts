import { Routes } from '@angular/router';
import { superAdminAuthGuard } from './guards/super-admin-auth.guard';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/sa-login.component').then(m => m.SALoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/super-admin-layout.component').then(m => m.SuperAdminLayoutComponent),
    canActivate: [superAdminAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/sa-dashboard.component').then(m => m.SADashboardComponent)
      },
      {
        path: 'organizations',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/organizations/sa-organizations.component').then(m => m.SAOrganizationsComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/organizations/sa-org-detail.component').then(m => m.SAOrgDetailComponent)
          }
        ]
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./pages/subscriptions/sa-subscriptions.component').then(m => m.SASubscriptionsComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/sa-analytics.component').then(m => m.SAAnalyticsComponent)
      },
      {
        path: 'service-templates',
        loadComponent: () => import('./pages/service-templates/sa-service-templates.component').then(m => m.SAServiceTemplatesComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./pages/audit-logs/sa-audit-logs.component').then(m => m.SAAuditLogsComponent)
      },
      {
        path: 'announcements',
        loadComponent: () => import('./pages/announcements/sa-announcements.component').then(m => m.SAAnnouncementsComponent)
      },
      {
        path: 'admins',
        loadComponent: () => import('./pages/admins/sa-admins.component').then(m => m.SAAdminsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/sa-settings.component').then(m => m.SASettingsComponent)
      }
    ]
  }
];
