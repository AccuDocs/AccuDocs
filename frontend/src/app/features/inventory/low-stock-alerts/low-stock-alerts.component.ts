import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { LowStockAlert } from '../models/inventory.models';

@Component({
  selector: 'app-low-stock-alerts',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
          <h1 class="text-xl font-bold">Low Stock Alerts</h1>
          @if (outOfStock() > 0) {
            <span class="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{{ outOfStock() }} out of stock</span>
          }
        </div>
        <a routerLink="/inventory/purchase-orders/new"
           class="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-all">
          <mat-icon class="text-[16px] w-4 h-4">receipt_long</mat-icon> Create POs
        </a>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Item</th>
                <th class="px-4 py-3 text-left">SKU</th>
                <th class="px-4 py-3 text-right">Current Stock</th>
                <th class="px-4 py-3 text-right">Reorder Point</th>
                <th class="px-4 py-3 text-right">Reorder Qty</th>
                <th class="px-4 py-3 text-center">Severity</th>
                <th class="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              @if (loading()) {
                @for (i of [1,2,3,4]; track i) {
                  <tr><td colspan="7" class="px-4 py-3"><div class="h-5 bg-slate-800 rounded animate-pulse"></div></td></tr>
                }
              } @else {
                @for (alert of alerts(); track alert.itemId) {
                  <tr class="hover:bg-slate-800/30 transition-colors" [class]="alert.severity === 'out_of_stock' ? 'bg-rose-950/20' : ''">
                    <td class="px-4 py-3 font-semibold text-white">{{ alert.name }}</td>
                    <td class="px-4 py-3 font-mono text-indigo-300 text-xs">{{ alert.sku || '—' }}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold"
                        [class]="alert.qtyOnHand <= 0 ? 'text-rose-400' : 'text-amber-400'">
                      {{ alert.qtyOnHand | number:'1.0-2' }}
                    </td>
                    <td class="px-4 py-3 text-right font-mono text-slate-400">{{ alert.reorderPoint }}</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-400">{{ alert.reorderQty || '—' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            [class]="alert.severity === 'out_of_stock' ? 'bg-rose-600/30 text-rose-300' : 'bg-amber-600/30 text-amber-300'">
                        {{ alert.severity === 'out_of_stock' ? '🔴 Out of Stock' : '⚠️ Low Stock' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <a [routerLink]="['/inventory/purchase-orders/new']"
                         [queryParams]="{ itemId: alert.itemId, qty: alert.reorderQty }"
                         class="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                        Create PO
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="py-20 text-center text-slate-500">
                      <p class="text-4xl mb-3">✅</p>
                      <p class="font-semibold">All stock levels are healthy!</p>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class LowStockAlertsComponent implements OnInit {
  private service = inject(InventoryService);
  alerts = signal<LowStockAlert[]>([]);
  loading = signal(true);
  outOfStock = signal(0);

  ngOnInit() {
    this.service.getLowStockAlerts().subscribe({
      next: (res: any) => {
        const data: LowStockAlert[] = res.data ?? [];
        this.alerts.set(data.sort((a, b) => a.qtyOnHand - b.qtyOnHand));
        this.outOfStock.set(data.filter(a => a.severity === 'out_of_stock').length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
