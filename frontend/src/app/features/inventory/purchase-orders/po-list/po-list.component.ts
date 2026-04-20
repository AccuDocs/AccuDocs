import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { PurchaseOrder, POStatus } from '../../models/inventory.models';

const STATUS_CONFIG: Record<POStatus, { label: string; class: string }> = {
  draft:     { label: 'Draft',     class: 'bg-slate-500/20 text-slate-300' },
  sent:      { label: 'Sent',      class: 'bg-blue-500/20 text-blue-300' },
  partial:   { label: 'Partial',   class: 'bg-amber-500/20 text-amber-300' },
  received:  { label: 'Received',  class: 'bg-emerald-500/20 text-emerald-300' },
  cancelled: { label: 'Cancelled', class: 'bg-rose-500/20 text-rose-300' },
};

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
          <h1 class="text-xl font-bold">Purchase Orders</h1>
          <span class="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">{{ total() }}</span>
        </div>
        <a routerLink="/inventory/purchase-orders/new"
           class="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-all">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New PO
        </a>
      </div>

      <!-- Status Filter Pills -->
      <div class="flex gap-2 flex-wrap mb-6">
        @for (s of statusOptions; track s.value) {
          <button (click)="setStatus(s.value)"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  [class]="filterStatus === s.value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'">
            {{ s.label }}
          </button>
        }
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">PO Number</th>
                <th class="px-4 py-3 text-left">Supplier</th>
                <th class="px-4 py-3 text-left">Warehouse</th>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-left">Expected</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr><td colspan="8" class="px-4 py-3"><div class="h-5 bg-slate-800 rounded animate-pulse"></div></td></tr>
                }
              } @else {
                @for (po of orders(); track po.id) {
                  <tr class="hover:bg-slate-800/30 transition-colors group">
                    <td class="px-4 py-3 font-mono text-indigo-300 font-semibold text-xs">{{ po.poNumber }}</td>
                    <td class="px-4 py-3 font-semibold text-white">{{ po.supplier?.name || po.supplierClientId }}</td>
                    <td class="px-4 py-3 text-slate-400">{{ po.warehouse?.name || po.warehouseId }}</td>
                    <td class="px-4 py-3 text-slate-400 font-mono text-xs">{{ po.poDate | date:'dd MMM yyyy' }}</td>
                    <td class="px-4 py-3 text-slate-400 font-mono text-xs">{{ po.expectedDeliveryDate ? (po.expectedDeliveryDate | date:'dd MMM yyyy') : '—' }}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-white">₹{{ po.total | number:'1.0-0' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" [class]="statusCfg(po.status).class">
                        {{ statusCfg(po.status).label }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        @if (po.status === 'draft' || po.status === 'sent') {
                          <a [routerLink]="['/inventory/purchase-orders', po.id, 'receive']"
                             class="p-1 hover:bg-emerald-600/20 rounded text-emerald-400 text-xs font-bold px-2" title="Receive">
                            Receive
                          </a>
                        }
                        @if (po.status === 'draft') {
                          <button (click)="send(po)"
                                  class="p-1 hover:bg-blue-600/20 rounded text-blue-400 text-xs font-bold px-2" title="Send PO">
                            Send
                          </button>
                        }
                        @if (po.status === 'draft') {
                          <button (click)="cancel(po)"
                                  class="p-1 hover:bg-rose-600/20 rounded text-rose-400" title="Cancel">
                            <mat-icon class="text-[14px] w-3.5 h-3.5">close</mat-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="py-16 text-center text-slate-500">
                      <p class="text-4xl mb-3">📋</p>
                      <p>No purchase orders found</p>
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
export class PoListComponent implements OnInit {
  private service = inject(InventoryService);

  orders = signal<PurchaseOrder[]>([]);
  loading = signal(true);
  total = signal(0);
  filterStatus = '';

  statusOptions = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'partial', label: 'Partial' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  ngOnInit() { this.load(); }

  setStatus(s: string) { this.filterStatus = s; this.load(); }

  load() {
    this.loading.set(true);
    this.service.getPurchaseOrders({ status: this.filterStatus || undefined }).subscribe({
      next: (res: any) => {
        this.orders.set(res.data ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusCfg(status: POStatus) { return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft; }

  send(po: PurchaseOrder) {
    this.service.sendPurchaseOrder(po.id).subscribe({ next: () => this.load() });
  }

  cancel(po: PurchaseOrder) {
    if (confirm(`Cancel PO "${po.poNumber}"?`)) {
      this.service.cancelPurchaseOrder(po.id).subscribe({ next: () => this.load() });
    }
  }
}
