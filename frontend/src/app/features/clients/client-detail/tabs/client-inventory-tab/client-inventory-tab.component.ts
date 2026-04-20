import { Component, inject, input, signal, OnInit, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { ClientStockSummary, PurchaseOrder } from '@app/features/inventory/models/inventory.models';

@Component({
  selector: 'app-client-inventory-tab',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="p-6">
      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1,2,3]; track i) { <div class="h-16 bg-slate-100 rounded animate-pulse"></div> }
        </div>
      } @else {
        <!-- Summary Cards -->
        <div class="grid grid-cols-4 gap-4 mb-8">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">Purchases (Stock In)</p>
            <p class="text-2xl font-bold text-[#0f2540]">₹{{ summary()?.purchaseValue | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ summary()?.purchasedQty }} items</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">Sales (Stock Out)</p>
            <p class="text-2xl font-bold text-emerald-600">₹{{ summary()?.saleValue | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ summary()?.soldQty }} items</p>
          </div>
          <div class="bg-[#1a3a5c] border border-[#2c5282] rounded-xl p-4 shadow-sm text-white col-span-2 flex items-center justify-between">
            <div>
              <p class="text-[10px] uppercase font-bold text-indigo-300 mb-1">Active Purchase Orders</p>
              <p class="text-2xl font-bold">{{ purchaseOrders().length }} Orders Pending</p>
            </div>
            <a routerLink="/inventory/purchase-orders/new" [queryParams]="{ supplierId: clientId() }"
               class="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded font-semibold text-sm transition-all shadow-md">
              + New PO
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- Recent Movements -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 class="font-bold text-[#0f2540] text-sm uppercase">Recent Stock Movements</h3>
            </div>
            <div class="flex-1 overflow-auto max-h-[400px]">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th class="px-4 py-2 text-left">Date</th>
                    <th class="px-4 py-2 text-left">Type</th>
                    <th class="px-4 py-2 text-right">In</th>
                    <th class="px-4 py-2 text-right">Out</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (m of summary()?.movements || []; track m.id) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-2 font-mono text-[11px]">{{ m.transactionDate | date:'dd MMM' }}</td>
                      <td class="px-4 py-2">
                        <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                              [ngClass]="{
                                'bg-emerald-100 text-emerald-700': m.transactionType === 'purchase',
                                'bg-blue-100 text-blue-700': m.transactionType === 'sale'
                              }">
                          {{ m.transactionType }}
                        </span>
                      </td>
                      <td class="px-4 py-2 text-right font-mono text-emerald-600 font-bold">{{ m.qtyIn || '-' }}</td>
                      <td class="px-4 py-2 text-right font-mono text-rose-600 font-bold">{{ m.qtyOut || '-' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="py-8 text-center text-slate-400">No recent transactions</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Active Purchase Orders -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 class="font-bold text-[#0f2540] text-sm uppercase">Supplier POs</h3>
              <a routerLink="/inventory/purchase-orders" [queryParams]="{ clientId: clientId() }" class="text-indigo-600 hover:underline text-xs font-semibold">View All</a>
            </div>
            <div class="flex-1 overflow-auto max-h-[400px]">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th class="px-4 py-2 text-left">PO No</th>
                    <th class="px-4 py-2 text-left">Date</th>
                    <th class="px-4 py-2 text-right">Total</th>
                    <th class="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (po of purchaseOrders(); track po.id) {
                    <tr class="hover:bg-slate-50 group">
                      <td class="px-4 py-2 font-mono text-indigo-600 font-semibold cursor-pointer" [routerLink]="['/inventory/purchase-orders', po.id, 'receive']">{{ po.poNumber }}</td>
                      <td class="px-4 py-2 font-mono text-[11px]">{{ po.poDate | date:'dd MMM' }}</td>
                      <td class="px-4 py-2 text-right font-mono font-bold">₹{{ po.total | number:'1.0-0' }}</td>
                      <td class="px-4 py-2 text-center">
                        <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                              [ngClass]="{
                                'bg-slate-200 text-slate-600': po.status === 'draft',
                                'bg-blue-100 text-blue-700': po.status === 'sent',
                                'bg-emerald-100 text-emerald-700': po.status === 'received'
                              }">
                          {{ po.status }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="py-8 text-center text-slate-400">No active purchase orders</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ClientInventoryTabComponent implements OnInit, OnChanges {
  clientId = input.required<string>();
  private service = inject(InventoryService);

  summary = signal<ClientStockSummary | null>(null);
  purchaseOrders = signal<PurchaseOrder[]>([]);
  loading = signal(true);
  loaded = signal(false);

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clientId'] && !changes['clientId'].firstChange) {
      this.loadData();
    }
  }

  loadData() {
    if (!this.clientId()) return;
    this.loading.set(true);
    
    // Load summary
    this.service.getClientStockSummary(this.clientId()).subscribe({
      next: (res: any) => {
        this.summary.set(res.data);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => this.loading.set(false)
    });

    // Load POs
    this.service.getPurchaseOrdersByClient(this.clientId()).subscribe({
      next: (res: any) => {
        this.purchaseOrders.set(res.data ?? []);
      }
    });
  }
}
