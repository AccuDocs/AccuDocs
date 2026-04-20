import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';

@Component({
  selector: 'app-warehouse-stock-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/inventory/warehouses" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        <h1 class="text-xl font-bold">Stock Summary</h1>
        @if (warehouseName()) {
          <span class="text-indigo-300 text-sm">— {{ warehouseName() }}</span>
        }
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Item</th>
                <th class="px-4 py-3 text-left">SKU</th>
                <th class="px-4 py-3 text-left">Variant</th>
                <th class="px-4 py-3 text-right">On Hand</th>
                <th class="px-4 py-3 text-right">Reserved</th>
                <th class="px-4 py-3 text-right">Available</th>
                <th class="px-4 py-3 text-right">Avg Cost</th>
                <th class="px-4 py-3 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr><td colspan="8" class="px-4 py-3"><div class="h-5 bg-slate-800 rounded animate-pulse"></div></td></tr>
                }
              } @else {
                @for (row of stockRows(); track row.id) {
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <td class="px-4 py-3 font-semibold text-white">{{ row.item?.name }}</td>
                    <td class="px-4 py-3 font-mono text-[11px] text-indigo-300">{{ row.item?.sku || '—' }}</td>
                    <td class="px-4 py-3 text-slate-400 text-xs">{{ row.variant?.variantName || '—' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-white font-bold">{{ row.qtyOnHand | number:'1.0-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-amber-400">{{ row.qtyReserved | number:'1.0-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{{ row.qtyAvailable | number:'1.0-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-300">₹{{ row.avgCost | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">₹{{ (row.qtyOnHand * row.avgCost) | number:'1.0-0' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="py-16 text-center text-slate-500">No stock recorded for this warehouse</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class WarehouseStockViewComponent implements OnInit {
  private service = inject(InventoryService);
  private route = inject(ActivatedRoute);

  stockRows = signal<any[]>([]);
  loading = signal(true);
  warehouseName = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getWarehouseStock(id).subscribe({
      next: (res: any) => {
        this.stockRows.set(res.data ?? []);
        this.warehouseName.set(res.data?.[0]?.warehouse?.name ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
