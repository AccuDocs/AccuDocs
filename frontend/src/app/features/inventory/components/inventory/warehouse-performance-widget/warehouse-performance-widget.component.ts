import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { WarehousePerformanceRow } from '../../../models/inventory-dashboard.models';

@Component({
  selector: 'app-warehouse-performance-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, DecimalPipe],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Warehouse Health</p>
          <h2 class="panel-title">Warehouse Performance</h2>
        </div>
        <a routerLink="/inventory/warehouses" class="panel-link">Manage</a>
      </header>

      @if (loading()) {
        <div class="space-y-3 p-5">
          @for (row of skeletonRows; track row) {
            <div class="h-16 rounded-2xl bg-slate-100 animate-pulse"></div>
          }
        </div>
      } @else if (warehouses().length === 0) {
        <div class="empty-state">
          <mat-icon>warehouse</mat-icon>
          <p>No warehouse stock found</p>
          <a routerLink="/inventory/warehouses">Create warehouse</a>
        </div>
      } @else {
        <div class="space-y-3 p-4">
          @for (warehouse of warehouses(); track warehouse.id) {
            <a [routerLink]="['/inventory/warehouses', warehouse.id, 'stock']" class="warehouse-row">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="truncate text-sm font-black text-slate-950">{{ warehouse.name }}</p>
                    @if (warehouse.isDefault) {
                      <span class="rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-600">Default</span>
                    }
                  </div>
                  <p class="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ warehouse.code }} | {{ warehouse.itemCount }} stocked item(s)</p>
                </div>
                <p class="shrink-0 font-mono text-sm font-black text-emerald-700">INR {{ warehouse.stockValue | number:'1.0-0' }}</p>
              </div>

              <div class="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{{ warehouse.qtyOnHand | number:'1.0-2' }} on hand</span>
                <span>{{ warehouse.qtyReserved | number:'1.0-2' }} reserved</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-slate-950" [style.width.%]="warehouse.reservedPct"></div>
              </div>
            </a>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-panel { height: 100%; min-width: 0; overflow: hidden; border-radius: 24px; border: 1px solid #e2e8f0; background: white; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px; }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #94a3b8; }
    .panel-title { margin-top: 2px; font-size: 16px; font-weight: 950; color: #0f172a; }
    .panel-link { font-size: 12px; font-weight: 900; color: #4f46e5; }
    .warehouse-row { display: block; min-width: 0; border-radius: 16px; border: 1px solid #e2e8f0; padding: 14px; transition: all .16s ease; }
    .warehouse-row:hover { border-color: #c7d2fe; background: #f8faff; transform: translateY(-1px); }
    .empty-state { display: grid; place-items: center; gap: 8px; padding: 36px 20px; text-align: center; color: #64748b; font-weight: 800; }
    .empty-state a { color: #4f46e5; font-size: 12px; font-weight: 900; }
  `],
})
export class WarehousePerformanceWidgetComponent {
  readonly warehouses = input<WarehousePerformanceRow[]>([]);
  readonly loading = input(false);
  readonly skeletonRows = [1, 2, 3];
}
