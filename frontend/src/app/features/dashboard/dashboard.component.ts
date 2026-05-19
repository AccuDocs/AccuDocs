import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '@core/services/auth.service';
import { Client, ClientService, PaginatedResponse as ClientPage } from '@core/services/client.service';
import {
  ClientDeadlineAssignment,
  ComplianceService,
  ComplianceStats,
} from '@core/services/compliance.service';
import { Document, DocumentService, StorageStats } from '@core/services/document.service';
import { Log, LogService, LogStats } from '@core/services/log.service';
import { TaskService } from '@core/services/task.service';
import { Task, TaskStats } from '@app/models/task.model';
import { InvoiceService } from '@features/billing/services/invoice.service';
import { BillingMetrics } from '@features/billing/models/billing-metrics.model';

interface MetricCard {
  label: string;
  value: string;
  helper: string;
  icon: string;
  cardClass: string;
  labelClass: string;
  valueClass: string;
  iconClass: string;
  helperClass: string;
}

interface WorkloadRow {
  name: string;
  count: number;
}

interface QuickAction {
  label: string;
  description: string;
  route: string;
  icon: string;
  iconClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="home-shell min-h-full w-full p-6 text-slate-950">
      <section class="command-toolbar">
        <div class="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
              <span class="grid h-7 w-7 place-items-center rounded-lg bg-sky-100 text-sky-700">
                <mat-icon class="!h-4 !w-4 !text-base">space_dashboard</mat-icon>
              </span>
              Home Command Center
            </div>
            <h1 class="mt-3 text-[32px] font-black leading-tight tracking-normal text-slate-950">
              Good {{ getGreeting() }}, {{ authService.currentUser()?.name || 'Admin' }}
            </h1>
            <p class="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Track clients, filings, documents, and team execution from one operational dashboard.
            </p>
            <p class="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {{ getClientCount() }} active client workspace(s) · {{ getMonthlyDeadlineCount() }} compliance deadlines this month
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              (click)="refreshDashboard()"
            >
              <mat-icon class="!h-4 !w-4 !text-base">sync</mat-icon>
              Refresh Data
            </button>
            @if (authService.isAdmin()) {
              <a
                routerLink="/clients/client/create"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-50"
              >
                Add Client
              </a>
              <a
                routerLink="/compliance/calendar"
                class="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                New Filing
              </a>
            }
          </div>
        </div>
      </section>

      <section class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (metric of getMetricCards(); track metric.label) {
          <article class="metric-card" [ngClass]="metric.cardClass">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-[11px] font-black uppercase tracking-[0.2em]" [ngClass]="metric.labelClass">
                  {{ metric.label }}
                </p>
                <p class="mt-5 truncate font-mono text-[30px] font-black leading-none tracking-normal" [ngClass]="metric.valueClass">
                  {{ metric.value }}
                </p>
                <p class="mt-3 truncate text-xs font-bold" [ngClass]="metric.helperClass">{{ metric.helper }}</p>
              </div>
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-100" [ngClass]="metric.iconClass">
                <mat-icon class="!h-5 !w-5 !text-xl">{{ metric.icon }}</mat-icon>
              </div>
            </div>
          </article>
        }
      </section>

      <section class="dashboard-panel mt-5">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Actions</p>
            <h2 class="panel-title">Quick Actions</h2>
          </div>
        </header>

        <div class="action-grid">
          @for (action of quickActions; track action.label) {
            <a [routerLink]="action.route" class="action-card">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full" [ngClass]="action.iconClass">
                <mat-icon class="!h-5 !w-5 !text-xl">{{ action.icon }}</mat-icon>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-black text-slate-950">{{ action.label }}</p>
                <p class="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">
                  {{ action.description }}
                </p>
              </div>
            </a>
          }
        </div>
      </section>

      <section class="mt-5 grid gap-4 xl:grid-cols-3">
        <article class="dashboard-panel min-h-[300px]">
          <header class="panel-header">
            <div>
              <p class="eyebrow">Client Portfolio</p>
              <h2 class="panel-title">Active Clients</h2>
            </div>
            <a routerLink="/clients/client" class="panel-link">View all</a>
          </header>

          <div class="panel-body">
            @for (client of getActiveClients(); track client.id) {
              <a [routerLink]="['/clients/client', client.id]" class="list-row">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800">
                    {{ getInitials(getClientName(client)) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-950">{{ getClientName(client) }}</p>
                    <p class="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{{ getClientSubtext(client) }}</p>
                  </div>
                </div>
                <span class="shrink-0 rounded-full px-3 py-1 text-xs font-bold" [ngClass]="getClientBadgeClass(client)">
                  {{ getClientBadge(client) }}
                </span>
              </a>
            } @empty {
              <div class="panel-empty">
                <mat-icon class="text-emerald-600">groups</mat-icon>
                <p class="text-sm font-black text-slate-950">No active clients yet</p>
                <p class="text-xs font-medium text-slate-500">Add clients to start tracking filings.</p>
              </div>
            }
          </div>
        </article>

        <article class="dashboard-panel min-h-[300px]">
          <header class="panel-header">
            <div>
              <p class="eyebrow">Compliance Radar</p>
              <h2 class="panel-title">Upcoming Deadlines</h2>
            </div>
            <a routerLink="/compliance/calendar" class="panel-link">Calendar</a>
          </header>

          <div class="panel-body">
            @for (deadline of getUpcomingDeadlines(); track deadline.id) {
              <a routerLink="/compliance/calendar" class="list-row">
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-slate-950">{{ deadline.deadline?.title || 'Compliance deadline' }}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ formatDate(deadline.deadline?.dueDate) }}</p>
                </div>
                <span class="shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]" [ngClass]="getDeadlineBadgeClass(deadline.deadline?.dueDate)">
                  {{ getDeadlineBadge(deadline.deadline?.dueDate) }}
                </span>
              </a>
            } @empty {
              <div class="panel-empty">
                <mat-icon class="text-sky-600">event_available</mat-icon>
                <p class="text-sm font-black text-slate-950">No upcoming deadlines</p>
                <p class="text-xs font-medium text-slate-500">This week is clear.</p>
              </div>
            }
          </div>
        </article>

        <article class="dashboard-panel min-h-[300px]">
          <header class="panel-header">
            <div>
              <p class="eyebrow">Team Capacity</p>
              <h2 class="panel-title">Staff Workload</h2>
            </div>
            <a routerLink="/work/tasks" class="panel-link">Tasks</a>
          </header>

          <div class="panel-body space-y-3">
            @for (row of getStaffWorkload(); track row.name) {
              <a routerLink="/work/tasks" class="workload-card">
                <div class="flex items-center justify-between gap-3">
                  <p class="truncate text-sm font-black text-slate-950">{{ row.name }}</p>
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                    {{ row.count }} {{ row.count === 1 ? 'Task' : 'Tasks' }}
                  </span>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-slate-900" [style.width.%]="getWorkloadWidth(row.count)"></div>
                </div>
              </a>
            } @empty {
              <div class="panel-empty">
                <mat-icon class="text-amber-600">task_alt</mat-icon>
                <p class="text-sm font-black text-slate-950">No task workload</p>
                <p class="text-xs font-medium text-slate-500">Assigned tasks will appear here.</p>
              </div>
            }
          </div>
        </article>
      </section>

      <section class="mt-5 grid gap-4 xl:grid-cols-2">
        <article class="dashboard-panel min-h-[280px]">
          <header class="panel-header">
            <div>
              <p class="eyebrow">Workspace Vault</p>
              <h2 class="panel-title">Recent Documents</h2>
            </div>
            <a routerLink="/documents" class="panel-link">Open vault</a>
          </header>

          <div class="panel-body">
            @for (document of getRecentDocuments(); track document.id) {
              <a routerLink="/documents" class="list-row">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                    <mat-icon class="!h-5 !w-5 !text-xl">description</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-950">{{ document.originalName || document.title || document.fileName }}</p>
                    <p class="truncate text-xs font-semibold text-slate-500">
                      {{ document.uploadedBy.name || 'Workspace upload' }} · {{ formatDate(document.createdAt) }}
                    </p>
                  </div>
                </div>
              </a>
            } @empty {
              <div class="panel-empty">
                <mat-icon class="text-slate-500">folder_open</mat-icon>
                <p class="text-sm font-black text-slate-950">No documents yet</p>
                <p class="text-xs font-medium text-slate-500">Uploaded files will show up here.</p>
              </div>
            }
          </div>
        </article>

        <article class="dashboard-panel min-h-[280px]">
          <header class="panel-header">
            <div>
              <p class="eyebrow">Audit Feed</p>
              <h2 class="panel-title">Recent Activity</h2>
            </div>
            <a routerLink="/logs" class="panel-link">Logs</a>
          </header>

          <div class="panel-body">
            @for (activity of getRecentActivity(); track activity.id) {
              <a routerLink="/logs" class="list-row">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-700">
                    <mat-icon class="!h-5 !w-5 !text-xl">history</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-950">{{ activity.description }}</p>
                    <p class="truncate text-xs font-semibold text-slate-500">{{ formatActivityTime(activity.createdAt) }}</p>
                  </div>
                </div>
              </a>
            } @empty {
              <div class="panel-empty">
                <mat-icon class="text-sky-600">timeline</mat-icon>
                <p class="text-sm font-black text-slate-950">No recent activity</p>
                <p class="text-xs font-medium text-slate-500">Audit entries will appear here.</p>
              </div>
            }
          </div>
        </article>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
    }
    .home-shell {
      --dash-bg-top: #E7F0F6;
      --dash-bg-bottom: #DCE8F0;
      --dash-surface: rgba(247, 250, 252, 0.92);
      --dash-surface-solid: #F7FAFC;
      --dash-surface-muted: #EDF4F8;
      --dash-border: #C8D7E6;
      --dash-border-soft: #D9E4EF;
      --dash-text: #122033;
      --dash-text-sub: #314B67;
      --dash-muted: #647A94;
      --dash-faint: #879BB1;
      --dash-shadow-soft: 0 1px 3px rgba(28, 52, 78, 0.06);
      --dash-shadow-lift: 0 10px 26px rgba(28, 52, 78, 0.09);
      --dash-accent: #1D4ED8;
      --dash-sky: #0369A1;
      --dash-emerald: #047857;
      --dash-amber: #B45309;
      --dash-rose: #BE123C;
      --dash-blue-soft: #DCEBFC;
      --dash-emerald-soft: #DFF6EA;
      --dash-amber-soft: #FFF0CF;
      --dash-rose-soft: #FDE5E8;
      position: relative;
      overflow: hidden;
      color: var(--dash-text);
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 26%),
        radial-gradient(circle at top right, rgba(16, 185, 129, 0.07), transparent 24%),
        linear-gradient(180deg, var(--dash-bg-top) 0%, var(--dash-bg-bottom) 100%);
    }
    :host-context(.dark) .home-shell {
      --dash-bg-top: #07111F;
      --dash-bg-bottom: #0B1729;
      --dash-surface: rgba(16, 33, 58, 0.92);
      --dash-surface-solid: #10213A;
      --dash-surface-muted: #172B48;
      --dash-border: #263B59;
      --dash-border-soft: #203451;
      --dash-text: #EAF2FC;
      --dash-text-sub: #B8C7D9;
      --dash-muted: #8EA2BA;
      --dash-faint: #637A96;
      --dash-shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.24);
      --dash-shadow-lift: 0 12px 28px rgba(0, 0, 0, 0.28);
      --dash-accent: #93C5FD;
      --dash-sky: #93C5FD;
      --dash-emerald: #86EFAC;
      --dash-amber: #FCD34D;
      --dash-rose: #FDA4AF;
      --dash-blue-soft: rgba(96, 165, 250, 0.14);
      --dash-emerald-soft: rgba(16, 185, 129, 0.14);
      --dash-amber-soft: rgba(245, 158, 11, 0.16);
      --dash-rose-soft: rgba(244, 63, 94, 0.16);
    }
    .home-shell > * {
      position: relative;
    }
    .home-shell .text-slate-950,
    .home-shell .text-slate-900 {
      color: var(--dash-text) !important;
    }
    .home-shell .text-slate-800,
    .home-shell .text-slate-700,
    .home-shell .text-slate-600 {
      color: var(--dash-text-sub) !important;
    }
    .home-shell .text-slate-500 {
      color: var(--dash-muted) !important;
    }
    .home-shell .text-slate-400 {
      color: var(--dash-faint) !important;
    }
    .home-shell .text-sky-700,
    .home-shell .text-sky-600 {
      color: var(--dash-sky) !important;
    }
    .home-shell .text-emerald-800,
    .home-shell .text-emerald-700,
    .home-shell .text-emerald-600 {
      color: var(--dash-emerald) !important;
    }
    .home-shell .text-amber-800,
    .home-shell .text-amber-700,
    .home-shell .text-amber-600 {
      color: var(--dash-amber) !important;
    }
    .home-shell .text-red-700,
    .home-shell .text-rose-700 {
      color: var(--dash-rose) !important;
    }
    .home-shell .bg-white,
    .home-shell .bg-slate-50,
    .home-shell .bg-slate-100 {
      background: var(--dash-surface-muted) !important;
    }
    .home-shell .bg-sky-50,
    .home-shell .bg-sky-100 {
      background: var(--dash-blue-soft) !important;
    }
    .home-shell .bg-emerald-50,
    .home-shell .bg-emerald-100 {
      background: var(--dash-emerald-soft) !important;
    }
    .home-shell .bg-amber-50,
    .home-shell .bg-amber-100 {
      background: var(--dash-amber-soft) !important;
    }
    .home-shell .bg-red-100,
    .home-shell .bg-rose-100 {
      background: var(--dash-rose-soft) !important;
    }
    .home-shell .bg-slate-900 {
      background: var(--dash-accent) !important;
    }
    .home-shell .border-slate-100,
    .home-shell .border-slate-200,
    .home-shell .border-slate-300 {
      border-color: var(--dash-border) !important;
    }
    .home-shell .ring-slate-100 {
      --tw-ring-color: var(--dash-border-soft) !important;
    }
    .command-toolbar {
      border-radius: 24px;
      border: 1px solid var(--dash-border);
      background: var(--dash-surface);
      padding: 20px;
      box-shadow: var(--dash-shadow-soft);
      backdrop-filter: blur(14px);
    }
    .metric-card {
      min-width: 0;
      min-height: 132px;
      border-radius: 20px;
      border: 1px solid var(--dash-border);
      background: var(--dash-surface-solid);
      padding: 20px;
      box-shadow: var(--dash-shadow-soft);
      transition: box-shadow .16s ease;
    }
    .metric-card--blue {
      background: linear-gradient(135deg, var(--dash-blue-soft), var(--dash-surface-solid));
    }
    .metric-card--success {
      background: linear-gradient(135deg, var(--dash-emerald-soft), var(--dash-surface-solid));
    }
    .metric-card--warning {
      background: linear-gradient(135deg, var(--dash-amber-soft), var(--dash-surface-solid));
    }
    .metric-card--neutral {
      background: var(--dash-surface-solid);
    }
    .metric-card:hover {
      box-shadow: var(--dash-shadow-lift);
    }
    .dashboard-panel {
      min-width: 0;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid var(--dash-border);
      background: var(--dash-surface);
      box-shadow: var(--dash-shadow-soft);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--dash-border);
      padding: 16px 18px;
    }
    .panel-body {
      padding: 16px;
    }
    .eyebrow {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: var(--dash-faint);
    }
    .panel-title {
      margin-top: 2px;
      font-size: 16px;
      font-weight: 950;
      color: var(--dash-text);
    }
    .panel-link {
      font-size: 12px;
      font-weight: 900;
      color: var(--dash-accent);
    }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
      padding: 16px;
    }
    .action-card {
      display: flex;
      min-height: 72px;
      min-width: 0;
      align-items: center;
      gap: 14px;
      border-radius: 16px;
      border: 1px solid var(--dash-border);
      background: var(--dash-surface-solid);
      padding: 14px;
      transition: all .16s ease;
    }
    .action-card:hover {
      border-color: var(--dash-accent);
      background: var(--dash-surface-muted);
    }
    .list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-radius: 16px;
      padding: 14px 12px;
      transition: background-color .16s ease;
    }
    .list-row:hover {
      background: var(--dash-surface-muted);
    }
    .list-row + .list-row {
      border-top: 1px solid var(--dash-border-soft);
    }
    .workload-card {
      display: block;
      border-radius: 16px;
      border: 1px solid var(--dash-border);
      background: var(--dash-surface-solid);
      padding: 14px;
      transition: background-color .16s ease, border-color .16s ease;
    }
    .workload-card:hover {
      border-color: var(--dash-accent);
      background: var(--dash-surface-muted);
    }
    .panel-empty {
      display: grid;
      min-height: 220px;
      place-items: center;
      align-content: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  authService = inject(AuthService);
  private clientService = inject(ClientService);
  private complianceService = inject(ComplianceService);
  private documentService = inject(DocumentService);
  private invoiceService = inject(InvoiceService);
  private logService = inject(LogService);
  private taskService = inject(TaskService);

  readonly quickActions: QuickAction[] = [
    {
      label: 'Add client workspace',
      description: 'Create a new client profile and start onboarding compliance work.',
      route: '/clients/client/create',
      icon: 'person_add',
      iconClass: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Plan new filing',
      description: 'Open the calendar and queue the next statutory filing.',
      route: '/compliance/calendar',
      icon: 'calendar_month',
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Open document vault',
      description: 'Review uploaded files, folders, and workspace records.',
      route: '/documents',
      icon: 'folder_open',
      iconClass: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Review task queue',
      description: 'Check due tasks, overdue work, and execution progress.',
      route: '/work/tasks',
      icon: 'fact_check',
      iconClass: 'bg-amber-50 text-amber-700',
    },
  ];

  clientsResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.clientService.getClients(1, 4).pipe(map((res) => res))
        : of(null as ClientPage<Client> | null),
  });

  complianceStatsResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.complianceService.getStats().pipe(map((res) => res.data))
        : of(null as ComplianceStats | null),
  });

  upcomingDeadlinesResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.complianceService.getUpcomingThisWeek().pipe(map((res) => res.data))
        : of([] as ClientDeadlineAssignment[]),
  });

  storageStatsResource = rxResource({
    loader: () =>
      this.documentService.getStorageStats().pipe(
        map((res) => res.data as StorageStats),
        catchError(() => of(null as StorageStats | null))
      ),
  });

  recentDocumentsResource = rxResource({
    loader: () =>
      this.documentService.getDocuments(1, 3).pipe(
        map((res) => (res.data || []) as Document[]),
        catchError(() => of([] as Document[]))
      ),
  });

  billingMetricsResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.invoiceService.getMetrics().pipe(map((res) => res.data))
        : of(null as BillingMetrics | null),
  });

  taskStatsResource = rxResource({
    loader: () => this.taskService.getTaskStats(),
  });

  tasksResource = rxResource({
    loader: () => this.taskService.getTasks(1, 50).pipe(map((res) => res.data)),
  });

  logStatsResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.logService.getStats(30).pipe(map((res) => res.data as LogStats))
        : of(null as LogStats | null),
  });

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  getMetricCards(): MetricCard[] {
    const compliance = this.complianceStatsResource.value();
    const tasks = this.taskStatsResource.value();
    const billing = this.billingMetricsResource.value();

    const upcoming = this.toNumber(compliance?.upcoming);
    const overdue = this.toNumber(compliance?.overdue);
    const filed = this.toNumber(compliance?.filed);
    const pending = compliance ? this.toNumber(compliance.pending) || upcoming + overdue : 0;
    const totalCompliance = pending + filed + overdue + upcoming;
    const completedRate = totalCompliance > 0 ? Math.round((filed / totalCompliance) * 100) : 0;

    return [
      {
        label: 'Total Clients',
        value: String(this.getClientCount()),
        icon: 'groups',
        cardClass: 'metric-card--blue',
        labelClass: 'text-sky-700',
        valueClass: 'text-slate-950',
        iconClass: 'text-sky-700',
        helper: `+${Math.min(this.getClientCount(), 6)} this quarter`,
        helperClass: 'text-emerald-700 dark:text-emerald-300',
      },
      {
        label: 'Pending Filings',
        value: String(pending || tasks?.dueTodayCount || 0),
        icon: overdue > 0 ? 'assignment_late' : 'event_note',
        cardClass: overdue > 0 ? 'metric-card--warning' : 'metric-card--success',
        labelClass: overdue > 0 ? 'text-amber-700' : 'text-emerald-700',
        valueClass: overdue > 0 ? 'text-amber-800' : 'text-emerald-800',
        iconClass: overdue > 0 ? 'text-amber-700' : 'text-emerald-700',
        helper: `${overdue || tasks?.overdueCount || 0} urgent`,
        helperClass: overdue > 0 ? 'text-amber-700' : 'text-emerald-700',
      },
      {
        label: 'Completed',
        value: String(filed || tasks?.byStatus?.completed || 0),
        icon: 'task_alt',
        cardClass: 'metric-card--success',
        labelClass: 'text-emerald-700',
        valueClass: 'text-emerald-800',
        iconClass: 'text-emerald-700',
        helper: `${completedRate || this.getTaskCompletionRate()}% rate`,
        helperClass: 'text-emerald-700',
      },
      {
        label: 'Revenue',
        value: this.formatCompactINR(billing?.billedThisMonth || 0),
        icon: 'payments',
        cardClass: 'metric-card--neutral',
        labelClass: 'text-slate-400',
        valueClass: 'text-slate-950',
        iconClass: 'text-slate-700',
        helper: 'Monthly',
        helperClass: 'text-slate-500',
      },
    ];
  }

  refreshDashboard(): void {
    this.clientsResource.reload();
    this.complianceStatsResource.reload();
    this.upcomingDeadlinesResource.reload();
    this.storageStatsResource.reload();
    this.recentDocumentsResource.reload();
    this.billingMetricsResource.reload();
    this.taskStatsResource.reload();
    this.tasksResource.reload();
    this.logStatsResource.reload();
  }

  getMonthlyDeadlineCount(): number {
    const compliance = this.complianceStatsResource.value();
    if (!compliance) return 0;
    return this.toNumber(compliance.pending) + this.toNumber(compliance.overdue) + this.toNumber(compliance.upcoming);
  }

  getClientCount(): number {
    return this.clientsResource.value()?.meta.total || 0;
  }

  getActiveClients(): Client[] {
    return (this.clientsResource.value()?.data || []).slice(0, 2);
  }

  getUpcomingDeadlines(): ClientDeadlineAssignment[] {
    return (this.upcomingDeadlinesResource.value() || [])
      .slice()
      .sort((a, b) => this.getTime(a.deadline?.dueDate) - this.getTime(b.deadline?.dueDate))
      .slice(0, 3);
  }

  getRecentDocuments(): Document[] {
    return this.recentDocumentsResource.value() || [];
  }

  getRecentActivity(): Log[] {
    return (this.logStatsResource.value()?.recentActivity || []).slice(0, 3);
  }

  getStaffWorkload(): WorkloadRow[] {
    const counts = new Map<string, number>();

    for (const task of this.tasksResource.value() || []) {
      if (task.status === 'completed') continue;
      const name = task.assignee?.name || 'Unassigned';
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    if (counts.size === 0) {
      return this.getFallbackWorkload();
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  getClientName(client: Client): string {
    return client.businessName || client.user?.name || client.code || 'Client';
  }

  getClientSubtext(client: Client): string {
    return client.gstStatus || client.entityType || client.code || 'Client workspace';
  }

  getClientBadge(client: Client): string {
    const deadline = this.getClientDeadline(client.id);
    if (!deadline) return client.user?.isActive ? 'Active' : 'Inactive';

    if (this.getDaysUntil(deadline.deadline?.dueDate) <= 3) return 'Urgent';
    return 'Pending';
  }

  getClientBadgeClass(client: Client): string {
    const badge = this.getClientBadge(client);
    if (badge === 'Urgent') return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
    if (badge === 'Pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    if (badge === 'Inactive') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'No date';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }

  formatActivityTime(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const time = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    if (date.toDateString() === today.toDateString()) return `Today ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return this.formatDate(dateStr);
  }

  getDeadlineBadge(dateStr?: string): string {
    const days = this.getDaysUntil(dateStr);
    if (days < 0) return 'Overdue';
    if (days <= 3) return 'Urgent';
    if (days <= 7) return 'This week';
    return 'Upcoming';
  }

  getDeadlineBadgeClass(dateStr?: string): string {
    const badge = this.getDeadlineBadge(dateStr);
    if (badge === 'Overdue') return 'bg-rose-100 text-rose-700';
    if (badge === 'Urgent') return 'bg-amber-100 text-amber-700';
    if (badge === 'This week') return 'bg-sky-100 text-sky-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  getWorkloadWidth(count: number): number {
    const maxCount = Math.max(...this.getStaffWorkload().map((row) => row.count), 1);
    return Math.max(20, Math.round((count / maxCount) * 100));
  }

  private getFallbackWorkload(): WorkloadRow[] {
    const stats = this.taskStatsResource.value();
    if (!stats) return [];

    const rows: WorkloadRow[] = [
      { name: 'Pending', count: stats.byStatus?.pending || 0 },
      { name: 'In Progress', count: stats.byStatus?.['in-progress'] || 0 },
      { name: 'In Review', count: stats.byStatus?.review || 0 },
    ];

    return rows.filter((row) => row.count > 0);
  }

  private getTaskCompletionRate(): number {
    const stats: TaskStats | undefined = this.taskStatsResource.value();
    if (!stats?.totalTasks) return 0;
    return Math.round(((stats.byStatus?.completed || 0) / stats.totalTasks) * 100);
  }

  private getClientDeadline(clientId: string): ClientDeadlineAssignment | undefined {
    return (this.upcomingDeadlinesResource.value() || []).find((deadline) => deadline.clientId === clientId);
  }

  private getDaysUntil(dateStr?: string): number {
    if (!dateStr) return Number.MAX_SAFE_INTEGER;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  }

  private getTime(dateStr?: string): number {
    return dateStr ? new Date(dateStr).getTime() : Number.MAX_SAFE_INTEGER;
  }

  private formatCompactINR(value: number): string {
    if (!value) return 'INR 0';
    if (Math.abs(value) >= 10000000) return `INR ${this.formatOneDecimal(value / 10000000)}Cr`;
    if (Math.abs(value) >= 100000) return `INR ${this.formatOneDecimal(value / 100000)}L`;
    if (Math.abs(value) >= 1000) return `INR ${this.formatOneDecimal(value / 1000)}K`;
    return `INR ${Math.round(value)}`;
  }

  private formatOneDecimal(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
