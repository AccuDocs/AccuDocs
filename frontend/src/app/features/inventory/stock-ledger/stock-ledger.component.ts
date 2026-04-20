import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { StockLedgerEntry } from '../models/inventory.models';

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        <h1 class="text-xl font-bold">Stock Ledger</h1>
        <span class="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">{{ total() }} entries</span>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <input type="date" [(ngModel)]="startDate" class="input-filter" placeholder="From"/>
        <input type="date" [(ngModel)]="endDate"   class="input-filter" placeholder="To"/>
        <select [(ngModel)]="txnType" class="input-filter">
          <option value="">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="sale">Sale</option>
          <option value="transfer_in">Transfer In</option>
          <option value="transfer_out">Transfer Out</option>
          <option value="adjustment">Adjustment</option>
          <option value="opening_stock">Opening Stock</option>
        </select>
        <input type="text" [(ngModel)]="itemSearch" placeholder="Item ID or name"  class="input-filter"/>
        <button (click)="apply()"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-all">Apply</button>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th class="px-3 py-3 text-left">Date</th>
                <th class="px-3 py-3 text-left">Item</th>
                <th class="px-3 py-3 text-left">Warehouse</th>
                <th class="px-3 py-3 text-left">Type</th>
                <th class="px-3 py-3 text-left">Client</th>
                <th class="px-3 py-3 text-left">Batch</th>
                <th class="px-3 py-3 text-right">Qty In</th>
                <th class="px-3 py-3 text-right">Qty Out</th>
                <th class="px-3 py-3 text-right">Balance</th>
                <th class="px-3 py-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              @if (loading()) {
                @for (i of [1,2,3,4,5,6,7]; track i) {
                  <tr><td colspan="10" class="px-3 py-3"><div class="h-5 bg-slate-800 rounded animate-pulse"></div></td></tr>
                }
              } @else {
                @for (row of entries(); track row.id) {
                  <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-3 py-2.5 font-mono text-slate-400">{{ row.transactionDate | date:'dd MMM yy' }}</td>
                    <td class="px-3 py-2.5 font-semibold text-white max-w-[120px] truncate">{{ row.item?.name || row.itemId }}</td>
                    <td class="px-3 py-2.5 text-slate-400">{{ row.warehouse?.name || row.warehouseId }}</td>
                    <td class="px-3 py-2.5">
                      <span class="px-1.5 py-0.5 rounded font-bold uppercase text-[9px]" [class]="txnBadge(row.transactionType)">
                        {{ row.transactionType.replace('_', ' ') }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-slate-400">{{ row.client?.name || '—' }}</td>
                    <td class="px-3 py-2.5 font-mono text-slate-500 text-[10px]">{{ row.batchNo || '—' }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-emerald-400 font-semibold">{{ row.qtyIn || '—' }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-rose-400 font-semibold">{{ row.qtyOut || '—' }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-white font-bold">{{ row.runningBalance | number:'1.0-2' }}</td>
                    <td class="px-3 py-2.5 text-right font-mono text-slate-300">₹{{ row.rate | number:'1.2-2' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="10" class="py-16 text-center text-slate-500">No ledger entries found</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (total() > 20) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
            <span>Page {{ page() }}</span>
            <div class="flex gap-2">
              <button (click)="prevPage()" [disabled]="page() === 1" class="px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-40">← Prev</button>
              <button (click)="nextPage()" [disabled]="page() * 20 >= total()" class="px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-40">Next →</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`.input-filter { @apply bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-full; }`],
})
export class StockLedgerComponent implements OnInit {
  private service = inject(InventoryService);

  entries = signal<StockLedgerEntry[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);

  startDate = '';
  endDate = '';
  txnType = '';
  itemSearch = '';

  ngOnInit() { this.load(); }

  apply() { this.page.set(1); this.load(); }

  load() {
    this.loading.set(true);
    this.service.getStockLedger({
      startDate:       this.startDate || undefined,
      endDate:         this.endDate   || undefined,
      transactionType: this.txnType   || undefined,
      itemId:          this.itemSearch || undefined,
      page: this.page(), limit: 20,
    }).subscribe({
      next: (res: any) => {
        this.entries.set(res.data ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { this.page.update(p => p + 1); this.load(); }

  txnBadge(type: string): string {
    const map: Record<string, string> = {
      purchase: 'bg-emerald-500/20 text-emerald-300', sale: 'bg-blue-500/20 text-blue-300',
      transfer_in: 'bg-indigo-500/20 text-indigo-300', transfer_out: 'bg-orange-500/20 text-orange-300',
      adjustment: 'bg-slate-500/20 text-slate-300', opening_stock: 'bg-purple-500/20 text-purple-300',
    };
    return map[type] ?? 'bg-slate-500/20 text-slate-300';
  }
}
