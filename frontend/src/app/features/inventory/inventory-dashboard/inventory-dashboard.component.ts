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
    <div class="animate-in fade-in slide-in-from-bottom-4 p-6 duration-500 bg-[#f8fafd] min-h-screen">
      <div class="space-y-6">
        <!-- Professional Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-[#0f2540] pb-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 rounded bg-[#0f2540] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#7ec8f0]">
              Stock Management
            </div>
            <h1 class="text-2xl font-black tracking-tight text-[#0f2540] uppercase">Inventory Dashboard</h1>
            <p class="text-[11px] font-bold text-[#5a7a9a] uppercase mt-1">Central control: Stock, POs, Transfers & Valuation</p>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <a routerLink="/inventory/items/new"
               type="button"
               class="inline-flex items-center gap-2 rounded bg-[#1a3a5c] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#0f2540] active:scale-[0.97]">
              <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> Add Item
            </a>
            <a routerLink="/inventory/purchase-orders/new"
               type="button"
               class="inline-flex items-center gap-2 rounded bg-[#1a6e1a] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#0f5a0f] active:scale-[0.97]">
              <mat-icon class="text-[16px] w-4 h-4">receipt_long</mat-icon> New PO
            </a>
            <a routerLink="/inventory/transfers/new"
               type="button"
               class="inline-flex items-center gap-2 rounded bg-[#1a3a5c] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#0f2540] active:scale-[0.97]">
              <mat-icon class="text-[16px] w-4 h-4">swap_horiz</mat-icon> Transfer
            </a>
          </div>
        </div>

        <!-- Low Stock Alert Banner -->
        @if (lowStockAlerts().length > 0) {
          <div class="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl px-5 py-3">
            <mat-icon class="text-amber-600 font-bold">warning</mat-icon>
            <span class="text-amber-900 font-bold text-sm">
              ⚠️ {{ lowStockAlerts().length }} item{{ lowStockAlerts().length > 1 ? 's' : '' }} need restocking
            </span>
            <a routerLink="/inventory/low-stock"
               class="ml-auto text-amber-700 underline text-sm hover:text-amber-900 font-bold">View Alerts →</a>
          </div>
        }

        <!-- KPI Cards - Professional Accounting Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (kpi of kpiCards(); track kpi.label) {
            <div class="rounded border border-[#d0dde8] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div class="bg-[#1a3a5c] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                {{ kpi.label }}
              </div>
              <div class="p-4">
                @if (loading()) {
                  <div class="h-8 w-24 bg-slate-200 rounded animate-pulse"></div>
                } @else {
                  <p class="font-mono font-black text-2xl text-[#0f2540]">{{ kpi.value }}</p>
                }
                @if (kpi.sub) {
                  <p class="text-[10px] font-bold text-slate-500 mt-2 uppercase">{{ kpi.sub }}</p>
                }
              </div>
            </div>
          }
        </div>

        <!-- Main Grid: Stock Valuation + Recent Movements -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Top 10 Stock Valuation -->
          <div class="lg:col-span-1 rounded border border-[#d0dde8] bg-white overflow-hidden shadow-sm">
            <div class="flex items-center justify-between bg-[#1a3a5c] px-4 py-2">
              <h2 class="text-white font-bold text-[10px] uppercase tracking-widest">Top 10 by Value</h2>
              <a routerLink="/inventory/ledger" class="text-[#7ec8f0] hover:text-white text-[10px] font-bold underline">View All →</a>
            </div>
            <div class="p-4 space-y-1">
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="h-8 bg-slate-200 rounded animate-pulse mb-2"></div>
                }
              } @else {
                @for (row of top10ValuationRows(); track row.itemId) {
                  <div class="flex items-center justify-between py-2 border-b border-[#eef3f9] last:border-0">
                    <div class="flex-1 min-w-0">
                      <p class="text-[#0f2540] text-[11px] font-bold truncate">{{ row.itemName }}</p>
                      <p class="text-slate-500 text-[9px] font-bold">{{ row.qtyOnHand }} {{ row.uom }}</p>
                    </div>
                    <div class="text-right ml-4">
                      <p class="text-[#1a6e1a] text-[11px] font-black">₹{{ (row.stockValue | number:'1.0-0') }}</p>
                    </div>
                  </div>
                } @empty {
                  <p class="text-slate-500 text-sm text-center py-6">No stock data yet</p>
                }
              }
            </div>
          </div>

          <!-- Recent Movements Table -->
          <div class="lg:col-span-2 rounded border border-[#d0dde8] bg-white overflow-hidden shadow-sm">
            <div class="flex items-center justify-between bg-[#1a3a5c] px-4 py-2">
              <h2 class="text-white font-bold text-[10px] uppercase tracking-widest">Recent Stock Movements</h2>
              <a routerLink="/inventory/ledger" class="text-[#7ec8f0] hover:text-white text-[10px] font-bold underline">Full Ledger →</a>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[800px]">
                <thead>
                  <tr class="bg-[#dde8f2] text-[#0f2540] text-[10px] font-bold uppercase tracking-widest border-b border-[#d0dde8]">
                    <th class="px-4 py-2 text-left">Date</th>
                    <th class="px-4 py-2 text-left">Item</th>
                    <th class="px-4 py-2 text-left">Type</th>
                    <th class="px-4 py-2 text-right">Qty In</th>
                    <th class="px-4 py-2 text-right">Qty Out</th>
                    <th class="px-4 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#eef3f9]">
                  @if (loading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                      <tr><td colspan="6" class="px-4 py-3"><div class="h-5 bg-slate-200 rounded animate-pulse"></div></td></tr>
                    }
                  } @else {
                    @for (entry of recentMovements(); track entry.id) {
                      <tr class="hover:bg-[#e8f4fd] transition-colors">
                        <td class="px-4 py-2 text-[11px] font-bold text-slate-500 font-mono">{{ entry.transactionDate | date:'dd MMM' }}</td>
                        <td class="px-4 py-2 text-[11px] font-bold text-[#0f2540] truncate max-w-[120px]">{{ entry.item?.name || entry.itemId }}</td>
                        <td class="px-4 py-2">
                          <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                [class]="txnBadge(entry.transactionType)">
                            {{ entry.transactionType.replace('_', ' ') }}
                          </span>
                        </td>
                        <td class="px-4 py-2 text-right text-[#1a6e1a] font-mono font-bold text-[11px]">{{ entry.qtyIn || '-' }}</td>
                        <td class="px-4 py-2 text-right text-[#b91c1c] font-mono font-bold text-[11px]">{{ entry.qtyOut || '-' }}</td>
                        <td class="px-4 py-2 text-right text-[#0f2540] font-mono font-black text-[11px]">{{ entry.runningBalance }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-10 text-center text-slate-500 text-sm">No movements recorded yet</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Quick Action Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          @for (action of quickActions; track action.label) {
            <a [routerLink]="action.route"
               class="flex flex-col items-center gap-2 p-4 rounded border border-[#d0dde8] bg-white hover:bg-[#dde8f2] hover:border-[#1a3a5c] transition-all group cursor-pointer shadow-sm hover:shadow-md">
              <span class="text-2xl group-hover:scale-110 transition-transform">{{ action.icon }}</span>
              <span class="text-[#0f2540] text-[11px] font-bold uppercase text-center tracking-wider">{{ action.label }}</span>
            </a>
          }
        </div>

        <!-- Right Sidebar Summary -->
        <div class="w-full xl:w-72 space-y-6">
          <div class="rounded border border-[#d0dde8] bg-white overflow-hidden shadow-sm">
            <div class="bg-[#1a3a5c] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
              Dashboard Summary
            </div>
            <div class="p-4 space-y-4">
              <div>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Stock Value</p>
                <p class="font-mono font-black text-lg text-[#0f2540]">₹{{ totalStockValue() }}</p>
              </div>
              <div class="pt-3 border-t border-[#eef3f9]">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Items</p>
                <p class="font-mono font-black text-lg text-[#b91c1c]">{{ lowStockAlerts().length }}</p>
              </div>
              <div class="pt-3 border-t-2 border-[#1a3a5c]">
                <p class="text-[9px] font-bold text-[#1a3a5c] uppercase tracking-widest">Pending POs</p>
                <p class="font-mono font-black text-xl text-[#0f2540]">{{ pendingPos() }}</p>
                <p class="text-[10px] font-bold text-slate-500 mt-1 italic">Awaiting receipt</p>
              </div>
            </div>
          </div>
        </div>
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

  // Computed signals for sidebar
  totalStockValue = () => {
    const total = this.top10ValuationRows().reduce((sum, row) => sum + (row.stockValue || 0), 0);
    return this.formatNumber(total);
  };
  pendingPos = () => this.kpiCards()[3].value || '0';

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
      purchase: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      sale: 'bg-blue-50 text-blue-700 border border-blue-200',
      transfer_in: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      transfer_out: 'bg-orange-50 text-orange-700 border border-orange-200',
      adjustment: 'bg-slate-100 text-slate-700 border border-slate-200',
      opening_stock: 'bg-purple-50 text-purple-700 border border-purple-200',
      return: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
    return map[type] ?? 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}
