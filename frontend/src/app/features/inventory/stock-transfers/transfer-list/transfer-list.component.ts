import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { StockTransfer } from '../../models/inventory.models';

@Component({
  selector: 'app-transfer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
          <h1 class="text-xl font-bold">Stock Transfers</h1>
        </div>
        <a routerLink="/inventory/transfers/new"
           class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-all">
          <mat-icon class="text-[16px] w-4 h-4">swap_horiz</mat-icon> New Transfer
        </a>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Transfer No.</th>
                <th class="px-4 py-3 text-left">From</th>
                <th class="px-4 py-3 text-left">To</th>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <tr><td colspan="6" class="px-4 py-3"><div class="h-5 bg-slate-800 rounded animate-pulse"></div></td></tr>
                }
              } @else {
                @for (t of transfers(); track t.id) {
                  <tr class="hover:bg-slate-800/30 transition-colors group">
                    <td class="px-4 py-3 font-mono text-indigo-300 text-xs font-semibold">{{ t.transferNo }}</td>
                    <td class="px-4 py-3 font-semibold text-white">{{ t.fromWarehouse?.name || t.fromWarehouseId }}</td>
                    <td class="px-4 py-3 font-semibold text-white">{{ t.toWarehouse?.name || t.toWarehouseId }}</td>
                    <td class="px-4 py-3 text-slate-400 font-mono text-xs">{{ t.transferDate | date:'dd MMM yyyy' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" [class]="statusClass(t.status)">
                        {{ t.status.replace('_', ' ') }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        @if (t.status === 'draft') {
                          <button (click)="dispatch(t)"
                                  class="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded font-bold transition-all">
                            Dispatch
                          </button>
                        }
                        @if (t.status === 'in_transit') {
                          <button (click)="receive(t)"
                                  class="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded font-bold transition-all">
                            Receive
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="py-16 text-center text-slate-500">
                      <p class="text-4xl mb-3">🔄</p>
                      <p>No stock transfers yet</p>
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
export class TransferListComponent implements OnInit {
  private service = inject(InventoryService);
  transfers = signal<StockTransfer[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.service.getTransfers().subscribe({
      next: (res: any) => { this.transfers.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusClass(status: string): string {
    return {
      draft:      'bg-slate-500/20 text-slate-300',
      in_transit: 'bg-blue-500/20 text-blue-300',
      received:   'bg-emerald-500/20 text-emerald-300',
      cancelled:  'bg-rose-500/20 text-rose-300',
    }[status] ?? 'bg-slate-500/20 text-slate-300';
  }

  dispatch(t: StockTransfer) {
    this.service.dispatchTransfer(t.id).subscribe({ next: () => this.ngOnInit() });
  }

  receive(t: StockTransfer) {
    this.service.receiveTransfer(t.id).subscribe({ next: () => this.ngOnInit() });
  }
}
