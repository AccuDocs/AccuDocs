import { Component, computed, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { LowStockAlert } from '../../../models/inventory.models';

@Component({
  selector: 'app-low-stock-alert-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DecimalPipe],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Inventory Risk</p>
          <h2 class="panel-title">Low Stock Alerts</h2>
        </div>
        <a routerLink="/inventory/low-stock" class="panel-link">View all</a>
      </header>

      @if (loading()) {
        <div class="space-y-3 p-5">
          @for (row of skeletonRows; track row) {
            <div class="h-14 rounded-2xl bg-slate-100 animate-pulse"></div>
          }
        </div>
      } @else if (alerts().length === 0) {
        <div class="empty-state">
          <mat-icon>verified</mat-icon>
          <p class="font-black text-slate-800">All reorder levels are healthy</p>
          <span>No low-stock item needs attention right now.</span>
        </div>
      } @else {
        <div class="divide-y divide-slate-100">
          @for (alert of visibleAlerts(); track alert.itemId) {
            <div class="flex items-center gap-3 p-4">
              <div class="grid h-10 w-10 place-items-center rounded-2xl"
                   [ngClass]="alert.severity === 'out_of_stock' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'">
                <mat-icon class="!h-5 !w-5 !text-xl">{{ alert.severity === 'out_of_stock' ? 'error' : 'warning' }}</mat-icon>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-black text-slate-900">{{ alert.name }}</p>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">SKU {{ alert.sku || 'NA' }}</p>
              </div>
              <div class="text-right">
                <p class="font-mono text-sm font-black text-slate-950">{{ alert.qtyOnHand | number:'1.0-2' }}</p>
                <p class="text-[10px] font-bold text-slate-400">Min {{ alert.reorderPoint }}</p>
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-panel { height: 100%; min-width: 0; overflow: hidden; border-radius: 20px; border: 1px solid #dbe3ef; background: white; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #dbe3ef; padding: 16px 18px; }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #94a3b8; }
    .panel-title { margin-top: 2px; font-size: 16px; font-weight: 950; color: #0f172a; }
    .panel-link { font-size: 12px; font-weight: 900; color: #4f46e5; }
    .empty-state { display: grid; min-height: 360px; place-items: center; align-content: center; gap: 8px; padding: 36px 20px; text-align: center; color: #64748b; }
    .empty-state mat-icon { color: #059669; }
  `],
})
export class LowStockAlertWidgetComponent {
  readonly alerts = input<LowStockAlert[]>([]);
  readonly loading = input(false);
  readonly skeletonRows = [1, 2, 3];
  readonly visibleAlerts = computed(() => this.alerts().slice(0, 5));
}
