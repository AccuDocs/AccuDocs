import { Component, inject, input, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-client-inventory-valuation',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase">Stock Valuation</h3>
        <div class="flex gap-2">
          <button (click)="refreshData()" class="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded">
            <mat-icon class="text-[16px] w-4 h-4 inline mr-1">refresh</mat-icon> Refresh
          </button>
          <button (click)="exportToExcel()" [disabled]="data().length === 0" class="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50">
            <mat-icon class="text-[16px] w-4 h-4 inline mr-1">download</mat-icon> Export
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="p-4 flex gap-4 bg-white border-b border-slate-100">
        <select [(ngModel)]="method" (ngModelChange)="refreshData()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="FIFO">FIFO</option>
          <option value="weighted_avg">Weighted Average</option>
        </select>
        <select [(ngModel)]="warehouseFilter" (ngModelChange)="refreshData()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="">All Warehouses</option>
          @for (wh of warehouses(); track wh.id) {
            <option [value]="wh.id">{{ wh.name }}</option>
          }
        </select>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">Item</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Warehouse</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Qty</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Avg Cost</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Total Value</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">Loading valuation...</td></tr>
            } @else if (data().length === 0) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">No stock to value</td></tr>
            } @else {
              @for (item of data(); track item.itemId + item.warehouseId) {
                <tr class="hover:bg-slate-50" [class]="item.isLowStock ? 'bg-red-50' : ''">
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{{ item.itemName }}</div>
                    @if (item.isLowStock) {
                      <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Low Stock</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-[11px] text-slate-500">{{ item.warehouseName }}</td>
                  <td class="px-4 py-3 text-right font-mono">{{ item.qtyOnHand | number }}</td>
                  <td class="px-4 py-3 text-right font-mono text-slate-600">₹{{ item.avgCost | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{{ item.totalValue | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right flex gap-1 justify-end">
                    <button (click)="expandRow(item.itemId)" class="text-slate-400 hover:text-indigo-600" title="FIFO Layers">
                      <mat-icon class="text-[18px]">expand_more</mat-icon>
                    </button>
                    @if (item.isLowStock) {
                      <button (click)="createPO(item)" class="text-slate-400 hover:text-emerald-600" title="Create PO">
                        <mat-icon class="text-[18px]">add_circle</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
                @if (expandedItemId() === item.itemId && item.fifoLayers) {
                  <tr class="bg-slate-50">
                    <td colspan="6" class="px-4 py-3">
                      <div class="bg-white border border-slate-200 rounded p-3">
                        <h4 class="font-bold text-[11px] text-slate-900 mb-2">FIFO Cost Layers</h4>
                        <table class="w-full text-[10px]">
                          <thead class="bg-slate-100">
                            <tr>
                              <th class="px-2 py-1 text-left">Batch</th>
                              <th class="px-2 py-1 text-right">Qty</th>
                              <th class="px-2 py-1 text-right">Rate</th>
                              <th class="px-2 py-1 text-right">Value</th>
                              <th class="px-2 py-1 text-left">Received</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-200">
                            @for (layer of item.fifoLayers; track layer.batchNo) {
                              <tr>
                                <td class="px-2 py-1 font-mono">{{ layer.batchNo || '-' }}</td>
                                <td class="px-2 py-1 text-right font-mono">{{ layer.qty }}</td>
                                <td class="px-2 py-1 text-right font-mono">₹{{ layer.rate | number:'1.2-2' }}</td>
                                <td class="px-2 py-1 text-right font-mono font-bold">₹{{ layer.value | number:'1.2-2' }}</td>
                                <td class="px-2 py-1 font-mono text-[9px]">{{ layer.receivedOn | date:'dd MMM' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Summary Footer -->
      @if (data().length > 0) {
        <div class="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center font-bold">
          <span class="text-slate-700">Grand Total Stock Value</span>
          <span class="text-2xl text-slate-900 font-mono">₹{{ grandTotal() | number:'1.2-2' }}</span>
        </div>
      }
    </div>
  `,
})
export class ClientInventoryValuationComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private toast = inject(ToastService);

  data = signal<any[]>([]);
  loading = signal(false);
  warehouses = signal<any[]>([]);
  
  method = 'FIFO';
  warehouseFilter = '';
  expandedItemId = signal<string | null>(null);

  grandTotal = computed(() => {
    return this.data().reduce((sum, item) => sum + (item.totalValue || 0), 0);
  });

  ngOnInit() {
    this.loadWarehouses();
    this.refreshData();
  }

  loadWarehouses() {
    this.service.getWarehouses().subscribe({
      next: (response: any) => this.warehouses.set(response.data || []),
      error: (err) => console.error('Failed to load warehouses', err),
    });
  }

  refreshData() {
    this.loading.set(true);
    this.service.getClientStockValuation(this.clientId(), {
      warehouseId: this.warehouseFilter || undefined,
      method: this.method as 'FIFO' | 'weighted_avg',
    }).subscribe({
      next: (response: any) => {
        const data = response.items || response.data || response || [];
        this.data.set(data);
      },
      error: (err) => {
        console.error('Failed to load valuation', err);
        this.toast.error('Failed to load stock valuation');
      },
      complete: () => this.loading.set(false),
    });
  }

  expandRow(itemId: string) {
    this.expandedItemId.set(this.expandedItemId() === itemId ? null : itemId);
  }

  createPO(item: any) {
    this.toast.info(`Create PO functionality would navigate to PO creation for low stock item: ${item.itemName}`);
  }

  exportToExcel() {
    const data = this.data();
    if (!data.length) {
      this.toast.warning('No data to export');
      return;
    }

    const headers = ['Item', 'Warehouse', 'Qty', 'Avg Cost', 'Total Value'];
    const rows = data.map(item => [
      item.itemName,
      item.warehouseName,
      item.qtyOnHand,
      item.avgCost,
      item.totalValue,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
      '',
      'Grand Total,' + this.grandTotal(),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valuation_${this.clientId()}_${new Date().getTime()}.csv`;
    link.click();
  }
}
