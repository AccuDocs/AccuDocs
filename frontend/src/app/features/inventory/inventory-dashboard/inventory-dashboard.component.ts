import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { LowStockAlert, StockLedgerEntry } from '../models/inventory.models';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span class="text-3xl">📦</span> Inventory Hub
          </h1>
          <p class="text-slate-400 text-sm mt-1">Stock management, purchase orders & transfers</p>
        </div>
        <div class="flex gap-3">
          <a routerLink="/inventory/items/new"
             class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30">
            <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> Add Item
          </a>
          <a routerLink="/inventory/purchase-orders/new"
             class="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all">
            <mat-icon class="text-[16px] w-4 h-4">receipt_long</mat-icon> New PO
          </a>
          <a routerLink="/inventory/transfers/new"
             class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all">
            <mat-icon class="text-[16px] w-4 h-4">swap_horiz</mat-icon> Transfer
          </a>
        </div>
      </div>

      <!-- Low Stock Banner -->
      @if (lowStockAlerts().length > 0) {
        <div class="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3">
          <mat-icon class="text-amber-400">warning</mat-icon>
          <span class="text-amber-300 font-semibold text-sm">
            {{ lowStockAlerts().length }} item{{ lowStockAlerts().length > 1 ? 's' : '' }} need restocking
          </span>
          <a routerLink="/inventory/low-stock"
             class="ml-auto text-amber-400 underline text-sm hover:text-amber-300 font-medium">View Alerts →</a>
        </div>
      }

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @for (kpi of kpiCards(); track kpi.label) {
          <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all group">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{{ kpi.label }}</p>
                @if (loading()) {
                  <div class="h-7 w-24 bg-slate-700 rounded animate-pulse"></div>
                } @else {
                  <p class="text-2xl font-bold text-white">{{ kpi.value }}</p>
                }
              </div>
              <span class="text-2xl group-hover:scale-110 transition-transform">{{ kpi.icon }}</span>
            </div>
            @if (kpi.sub) {
              <p class="text-xs text-slate-500 mt-2">{{ kpi.sub }}</p>
            }
          </div>
        }
      </div>

      <!-- Main Grid: Valuation + Recent Movements -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Stock Valuation (Top 10) -->
        <div class="lg:col-span-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-white font-bold text-sm uppercase tracking-wide">Top 10 by Value</h2>
            <a routerLink="/inventory/ledger" class="text-indigo-400 hover:text-indigo-300 text-xs">View All →</a>
          </div>
          @if (loading()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="h-8 bg-slate-700 rounded mb-2 animate-pulse"></div>
            }
          } @else {
            @for (row of top10ValuationRows(); track row.itemId) {
              <div class="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div class="flex-1 min-w-0">
                  <p class="text-slate-200 text-xs font-medium truncate">{{ row.itemName }}</p>
                  <p class="text-slate-500 text-[10px]">{{ row.qtyOnHand }} {{ row.uom }}</p>
                </div>
                <div class="text-right ml-4">
                  <p class="text-emerald-400 text-xs font-bold">₹{{ (row.stockValue | number:'1.0-0') }}</p>
                </div>
              </div>
            } @empty {
              <p class="text-slate-500 text-sm text-center py-6">No stock data yet</p>
            }
          }
        </div>

        <!-- Recent Movements -->
        <div class="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-white font-bold text-sm uppercase tracking-wide">Recent Movements</h2>
            <a routerLink="/inventory/ledger" class="text-indigo-400 hover:text-indigo-300 text-xs">Full Ledger →</a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                  <th class="pb-2 text-left">Date</th>
                  <th class="pb-2 text-left">Item</th>
                  <th class="pb-2 text-left">Type</th>
                  <th class="pb-2 text-right">Qty In</th>
                  <th class="pb-2 text-right">Qty Out</th>
                  <th class="pb-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/30">
                @if (loading()) {
                  @for (i of [1,2,3,4,5]; track i) {
                    <tr><td colspan="6" class="py-2"><div class="h-5 bg-slate-700 rounded animate-pulse"></div></td></tr>
                  }
                } @else {
                  @for (entry of recentMovements(); track entry.id) {
                    <tr class="hover:bg-slate-700/30 transition-colors">
                      <td class="py-2 text-slate-400 font-mono">{{ entry.transactionDate | date:'dd MMM' }}</td>
                      <td class="py-2 text-slate-200 truncate max-w-[120px]">{{ entry.item?.name || entry.itemId }}</td>
                      <td class="py-2">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                              [class]="txnBadge(entry.transactionType)">
                          {{ entry.transactionType.replace('_', ' ') }}
                        </span>
                      </td>
                      <td class="py-2 text-right text-emerald-400 font-mono">{{ entry.qtyIn || '-' }}</td>
                      <td class="py-2 text-right text-red-400 font-mono">{{ entry.qtyOut || '-' }}</td>
                      <td class="py-2 text-right text-white font-mono font-bold">{{ entry.runningBalance }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-10 text-center text-slate-500">No movements recorded yet</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Action Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        @for (action of quickActions; track action.label) {
          <a [routerLink]="action.route"
             class="flex flex-col items-center gap-2 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 hover:border-indigo-500/30 transition-all group cursor-pointer">
            <span class="text-2xl group-hover:scale-110 transition-transform">{{ action.icon }}</span>
            <span class="text-slate-300 text-xs font-semibold text-center">{{ action.label }}</span>
          </a>
        }
      </div>
    </div>
  `,
})
export class InventoryDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = signal(true);
  lowStockAlerts = signal<LowStockAlert[]>([]);
  recentMovements = signal<StockLedgerEntry[]>([]);
  top10ValuationRows = signal<any[]>([]);

  kpiCards = signal<Array<{ label: string; value: string; icon: string; sub?: string }>>([
    { label: 'Total SKUs', value: '—', icon: '📦' },
    { label: 'Stock Value', value: '—', icon: '💰' },
    { label: 'Low Stock Items', value: '—', icon: '⚠️' },
    { label: 'Pending POs', value: '—', icon: '🛒' },
  ]);

  quickActions = [
    { icon: '➕', label: 'Add Item', route: '/inventory/items/new' },
    { icon: '🔧', label: 'Stock Adjust', route: '/inventory/ledger' },
    { icon: '📋', label: 'New PO', route: '/inventory/purchase-orders/new' },
    { icon: '🔍', label: 'Scan Barcode', route: '/inventory/scanner' },
  ];

  ngOnInit() {
    this.loadDashboard();
  }

  private loadDashboard() {
    this.loading.set(true);

    this.inventoryService.getLowStockAlerts().subscribe({
      next: (res: any) => {
        const alerts = res.data ?? [];
        this.lowStockAlerts.set(alerts);
        this.updateKpi(2, String(alerts.length), '⚠️');
        const outOfStock = alerts.filter((a: any) => a.severity === 'out_of_stock').length;
        this.updateKpiSub(2, outOfStock > 0 ? `${outOfStock} out of stock` : 'Review reorder points');
      },
      error: () => {},
    });

    this.inventoryService.getStockLedger({ limit: 20 }).subscribe({
      next: (res: any) => {
        this.recentMovements.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.inventoryService.getStockValuation().subscribe({
      next: (res: any) => {
        const report = res.data;
        const rows = (report?.rows ?? []).sort((a: any, b: any) => b.stockValue - a.stockValue).slice(0, 10);
        this.top10ValuationRows.set(rows);
        this.updateKpi(1, `₹${this.formatNumber(report?.totalStockValue ?? 0)}`, '💰');
        this.updateKpi(0, String(report?.rows?.length ?? 0), '📦');
      },
      error: () => {},
    });

    this.inventoryService.getPurchaseOrders({ status: 'sent', limit: 1 }).subscribe({
      next: (res: any) => this.updateKpi(3, String(res.total ?? 0), '🛒'),
      error: () => {},
    });
  }

  private updateKpi(index: number, value: string, icon: string) {
    const cards = [...this.kpiCards()];
    cards[index] = { ...cards[index], value, icon };
    this.kpiCards.set(cards);
  }

  private updateKpiSub(index: number, sub: string) {
    const cards = [...this.kpiCards()];
    cards[index] = { ...cards[index], sub };
    this.kpiCards.set(cards);
  }

  private formatNumber(n: number): string {
    if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + 'Cr';
    if (n >= 1_00_000)    return (n / 1_00_000).toFixed(1) + 'L';
    if (n >= 1_000)       return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
  }

  txnBadge(type: string): string {
    const map: Record<string, string> = {
      purchase:      'bg-emerald-500/20 text-emerald-400',
      sale:          'bg-blue-500/20 text-blue-400',
      transfer_in:   'bg-indigo-500/20 text-indigo-400',
      transfer_out:  'bg-orange-500/20 text-orange-400',
      adjustment:    'bg-slate-500/20 text-slate-400',
      opening_stock: 'bg-purple-500/20 text-purple-400',
      return:        'bg-amber-500/20 text-amber-400',
    };
    return map[type] ?? 'bg-slate-500/20 text-slate-400';
  }
}
