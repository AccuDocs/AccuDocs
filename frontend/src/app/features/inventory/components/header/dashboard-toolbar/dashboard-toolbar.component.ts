import { Component, EventEmitter, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-toolbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DatePipe],
  template: `
    <section class="dashboard-toolbar rounded-3xl border border-primary-200 bg-gradient-to-br from-white via-primary-50/40 to-white p-5 shadow-sm">
      <div class="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="min-w-0">
          <div class="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-700">
            <mat-icon class="!h-3.5 !w-3.5 !text-sm">inventory_2</mat-icon>
            Inventory Control Center
          </div>
          <h1 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Inventory & Stock Overview</h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor stock value, low-stock risk, warehouse movement, purchase actions, and operational warnings from one ERP dashboard.
          </p>
          <p class="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            @if (lastUpdated()) {
              Last refreshed {{ lastUpdated() | date:'dd MMM yyyy, h:mm a' }}
            } @else {
              Waiting for dashboard data
            }
          </p>
        </div>

        <div class="toolbar-actions flex flex-wrap items-center gap-2">
          <button type="button"
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  [disabled]="loading()"
                  (click)="refresh.emit()">
            <mat-icon class="!h-4 !w-4 !text-base" [class.animate-spin]="loading()">sync</mat-icon>
            Refresh
          </button>
          <a routerLink="/inventory/items/new" class="toolbar-action primary">
            <mat-icon class="!h-4 !w-4 !text-base">add_box</mat-icon>
            Add Item
          </a>
          <a routerLink="/inventory/purchase-orders/new" class="toolbar-action success">
            <mat-icon class="!h-4 !w-4 !text-base">receipt_long</mat-icon>
            New PO
          </a>
          <a routerLink="/inventory/transfers/new" class="toolbar-action dark">
            <mat-icon class="!h-4 !w-4 !text-base">swap_horiz</mat-icon>
            Transfer
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-toolbar {
      overflow: hidden;
    }
    .toolbar-actions {
      min-width: 0;
    }
    .toolbar-action {
      display: inline-flex;
      height: 40px;
      justify-content: center;
      align-items: center;
      gap: 8px;
      border-radius: 12px;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 900;
      color: white;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .08);
      transition: background-color .16s ease, transform .16s ease;
    }
    .toolbar-action:hover { transform: translateY(-1px); }
    .toolbar-action.primary { background: #4f46e5; }
    .toolbar-action.success { background: #059669; }
    .toolbar-action.dark { background: #0f172a; }
    @media (max-width: 640px) {
      .toolbar-actions > * { flex: 1 1 140px; justify-content: center; }
    }
  `],
})
export class DashboardToolbarComponent {
  readonly loading = input(false);
  readonly lastUpdated = input<Date | null>(null);
  readonly refresh = output<void>();
}
