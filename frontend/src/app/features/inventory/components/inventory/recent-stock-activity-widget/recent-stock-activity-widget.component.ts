import { Component, input } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { StockLedgerEntry } from '../../../models/inventory.models';

@Component({
  selector: 'app-recent-stock-activity-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Stock Ledger</p>
          <h2 class="panel-title">Recent Stock Activity</h2>
        </div>
        <a routerLink="/inventory/ledger" class="panel-link">Full ledger</a>
      </header>

      <div class="ledger-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th class="text-right">In</th>
              <th class="text-right">Out</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              @for (row of skeletonRows; track row) {
                <tr>
                  <td colspan="7"><div class="h-6 rounded-xl bg-slate-100 animate-pulse"></div></td>
                </tr>
              }
            } @else {
              @for (entry of movements(); track entry.id) {
                <tr>
                  <td class="whitespace-nowrap font-mono text-slate-500">{{ entry.transactionDate | date:'dd MMM' }}</td>
                  <td>
                    <p class="max-w-[180px] truncate font-black text-slate-950">{{ entry.item?.name || entry.itemId }}</p>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ entry.item?.sku || 'No SKU' }}</span>
                  </td>
                  <td class="text-slate-600">{{ entry.warehouse?.name || 'Warehouse' }}</td>
                  <td>
                    <span class="rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider" [ngClass]="txnBadge(entry.transactionType)">
                      {{ entry.transactionType.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="text-right font-mono font-black text-emerald-700">{{ entry.qtyIn || '-' }}</td>
                  <td class="text-right font-mono font-black text-rose-700">{{ entry.qtyOut || '-' }}</td>
                  <td class="text-right font-mono font-black text-slate-950">{{ entry.runningBalance | number:'1.0-2' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="py-12 text-center text-sm font-bold text-slate-400">No stock movements recorded yet</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-panel { min-width: 0; overflow: hidden; border-radius: 24px; border: 1px solid #e2e8f0; background: white; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px; }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #94a3b8; }
    .panel-title { margin-top: 2px; font-size: 16px; font-weight: 950; color: #0f172a; }
    .panel-link { font-size: 12px; font-weight: 900; color: #4f46e5; }
    .ledger-scroll { max-width: 100%; overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
    .ledger-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
    table { width: 100%; min-width: 680px; border-collapse: collapse; }
    th { padding: 11px 14px; background: #f8fafc; color: #64748b; font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 700; }
    tr:hover td { background: #f8fbff; }
    @media (max-width: 900px) {
      table { min-width: 620px; }
      th, td { padding-left: 12px; padding-right: 12px; }
    }
  `],
})
export class RecentStockActivityWidgetComponent {
  readonly movements = input<StockLedgerEntry[]>([]);
  readonly loading = input(false);
  readonly skeletonRows = [1, 2, 3, 4, 5];

  txnBadge(type: string): string {
    const map: Record<string, string> = {
      purchase: 'bg-emerald-50 text-emerald-700',
      sale: 'bg-blue-50 text-blue-700',
      transfer_in: 'bg-indigo-50 text-indigo-700',
      transfer_out: 'bg-orange-50 text-orange-700',
      adjustment: 'bg-slate-100 text-slate-700',
      opening_stock: 'bg-violet-50 text-violet-700',
      return: 'bg-amber-50 text-amber-700',
      damage: 'bg-rose-50 text-rose-700',
    };
    return map[type] ?? 'bg-slate-100 text-slate-700';
  }
}
