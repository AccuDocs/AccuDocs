import { Component, inject, input, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';
import type { StockLedgerEntry } from '@app/features/inventory/models/inventory.models';

@Component({
  selector: 'app-client-inventory-activity',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase">Stock Activity</h3>
        <button (click)="exportToExcel()" [disabled]="filteredData().length === 0" class="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50">
          <mat-icon class="text-[16px] w-4 h-4">download</mat-icon> Export
        </button>
      </div>

      <!-- Filters -->
      <div class="p-4 flex flex-col md:flex-row gap-4 bg-white border-b border-slate-100">
        <div class="flex-1 min-w-0 relative">
          <mat-icon class="absolute left-3 top-2.5 text-slate-400">search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" placeholder="Search item name..." class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
        </div>
        <select [(ngModel)]="typeFilter" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 whitespace-nowrap">
          <option value="">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="sale">Sale</option>
          <option value="transfer_in">Transfer In</option>
          <option value="transfer_out">Transfer Out</option>
          <option value="adjustment">Adjustment</option>
          <option value="return">Return</option>
        </select>
        <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500" title="From">
        <input type="date" [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500" title="To">
      </div>

      <!-- Summary Bar -->
      <div class="px-5 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-6 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-blue-600 font-bold">Purchased:</span>
          <span class="text-blue-900 font-mono">₹{{ calculatePurchasedValue() | number:'1.2-2' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-emerald-600 font-bold">Sold:</span>
          <span class="text-emerald-900 font-mono">₹{{ calculateSoldValue() | number:'1.2-2' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-amber-600 font-bold">Returns:</span>
          <span class="text-amber-900 font-mono">₹{{ calculateReturnValue() | number:'1.2-2' }}</span>
        </div>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">Date</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Item</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Variant</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Batch</th>
              <th class="px-4 py-3 text-center border-y border-slate-200">Type</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Warehouse</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Qty In</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Qty Out</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Rate</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="10" class="py-12 text-center text-slate-400">Loading stock activity...</td></tr>
            } @else if (filteredData().length === 0) {
              <tr><td colspan="10" class="py-12 text-center text-slate-400">No stock activity found</td></tr>
            } @else {
              @for (entry of filteredData(); track entry.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">{{ entry.transactionDate | date:'dd MMM yyyy' }}</td>
                  <td class="px-4 py-3 text-slate-900 font-medium">{{ entry.item?.name || entry.itemId }}</td>
                  <td class="px-4 py-3 text-slate-500 text-[11px]">{{ entry.variant?.variantName || '-' }}</td>
                  <td class="px-4 py-3 text-slate-500 text-[11px]">{{ entry.batchNo || '-' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                          [ngClass]="getTypeBadgeClass(entry.transactionType)">
                      {{ entry.transactionType }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-slate-500 text-[11px]">{{ entry.warehouse?.name || '-' }}</td>
                  <td class="px-4 py-3 text-right font-mono text-emerald-600 font-bold">{{ entry.qtyIn || '-' }}</td>
                  <td class="px-4 py-3 text-right font-mono text-rose-600 font-bold">{{ entry.qtyOut || '-' }}</td>
                  <td class="px-4 py-3 text-right font-mono text-slate-600">₹{{ entry.rate | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{{ calculateValue(entry) | number:'1.2-2' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class ClientInventoryActivityComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private toast = inject(ToastService);

  data = signal<StockLedgerEntry[]>([]);
  loading = signal(false);
  
  searchQuery = '';
  typeFilter = '';
  dateFrom = '';
  dateTo = '';

  filteredData = computed(() => {
    let result = this.data();
    
    if (this.typeFilter) {
      result = result.filter(e => e.transactionType === this.typeFilter);
    }
    
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e => (e.item?.name || '').toLowerCase().includes(q));
    }
    
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      result = result.filter(e => new Date(e.transactionDate).getTime() >= from);
    }
    
    if (this.dateTo) {
      const to = new Date(this.dateTo).getTime();
      result = result.filter(e => new Date(e.transactionDate).getTime() <= to);
    }
    
    return result;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.service.getClientStockLedger(this.clientId()).subscribe({
      next: (response: any) => {
        this.data.set(response.data || response || []);
      },
      error: (err) => {
        console.error('Failed to load stock activity', err);
        this.toast.error('Failed to load stock activity');
      },
      complete: () => this.loading.set(false),
    });
  }

  onSearchChange() {
    // Filtering happens via computed()
  }

  onFilterChange() {
    // Filtering happens via computed()
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      'purchase': 'bg-blue-100 text-blue-700',
      'sale': 'bg-emerald-100 text-emerald-700',
      'transfer_in': 'bg-cyan-100 text-cyan-700',
      'transfer_out': 'bg-purple-100 text-purple-700',
      'adjustment': 'bg-gray-100 text-gray-700',
      'return': 'bg-amber-100 text-amber-700',
      'damage': 'bg-red-100 text-red-700',
    };
    return classes[type] || 'bg-slate-100 text-slate-700';
  }

  calculateValue(entry: StockLedgerEntry): number {
    return ((entry.qtyIn || 0) - (entry.qtyOut || 0)) * entry.rate;
  }

  calculatePurchasedValue(): number {
    return this.filteredData()
      .filter(e => e.transactionType === 'purchase')
      .reduce((sum, e) => sum + ((e.qtyIn || 0) * e.rate), 0);
  }

  calculateSoldValue(): number {
    return this.filteredData()
      .filter(e => e.transactionType === 'sale')
      .reduce((sum, e) => sum + ((e.qtyOut || 0) * e.rate), 0);
  }

  calculateReturnValue(): number {
    return this.filteredData()
      .filter(e => e.transactionType === 'return')
      .reduce((sum, e) => sum + ((e.qtyOut || 0) * e.rate), 0);
  }

  exportToExcel() {
    const data = this.filteredData();
    if (!data.length) {
      this.toast.warning('No data to export');
      return;
    }

    const headers = ['Date', 'Item', 'Variant', 'Batch', 'Type', 'Warehouse', 'Qty In', 'Qty Out', 'Rate', 'Value'];
    const rows = data.map(e => [
      new Date(e.transactionDate).toLocaleDateString(),
      e.item?.name || '',
      e.variant?.variantName || '',
      e.batchNo || '',
      e.transactionType,
      e.warehouse?.name || '',
      e.qtyIn || 0,
      e.qtyOut || 0,
      e.rate,
      this.calculateValue(e),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_activity_${this.clientId()}_${new Date().getTime()}.csv`;
    link.click();
  }
}
