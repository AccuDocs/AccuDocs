import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-toolbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, DatePipe],
  template: `
    <section class="dashboard-toolbar">
      <div class="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0">
          <div class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary-600">
            <span class="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <mat-icon class="!h-4 !w-4 !text-base">inventory_2</mat-icon>
            </span>
            Inventory Control Center
          </div>
          <h1 class="mt-3 text-[28px] font-black leading-tight tracking-normal text-slate-950">Inventory & Stock Overview</h1>
          <p class="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            Monitor stock value, reorder risk, warehouse health, purchase flow, and operational warnings from one control center.
          </p>
          <p class="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            @if (lastUpdated()) {
              Last refreshed {{ lastUpdated() | date:'dd MMM yyyy, h:mm a' }}
            } @else {
              Waiting for dashboard data
            }
          </p>
        </div>

        <div class="toolbar-actions flex flex-wrap items-center gap-2">
          <button type="button"
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  [disabled]="loading()"
                  (click)="refresh.emit()">
            <mat-icon class="!h-4 !w-4 !text-base" [class.animate-spin]="loading()">sync</mat-icon>
            Refresh Data
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-toolbar {
      min-width: 0;
    }
    .toolbar-actions {
      min-width: 0;
    }
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
