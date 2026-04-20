import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        <h1 class="text-xl font-bold">Barcode Scanner</h1>
      </div>

      <!-- Manual Barcode Entry -->
      <div class="max-w-xl mx-auto">
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 class="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">Barcode Lookup</h2>
          <div class="flex gap-3">
            <input [(ngModel)]="barcodeInput" type="text"
                   placeholder="Scan or type barcode / SKU…"
                   class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                   (keyup.enter)="lookup()"/>
            <button (click)="lookup()" [disabled]="!barcodeInput.trim() || searching()"
                    class="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-all disabled:opacity-50">
              <mat-icon>search</mat-icon>
            </button>
          </div>
          <p class="text-slate-500 text-xs mt-2">Connect a USB barcode scanner — it acts as keyboard input. Or type manually above.</p>
        </div>

        <!-- Result Card -->
        @if (searching()) {
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
            <div class="h-5 bg-slate-800 rounded mb-3 w-3/4"></div>
            <div class="h-4 bg-slate-800 rounded mb-2 w-1/2"></div>
            <div class="h-4 bg-slate-800 rounded w-2/3"></div>
          </div>
        }

        @if (notFound()) {
          <div class="bg-rose-950/30 border border-rose-700/40 rounded-xl p-6 text-center">
            <mat-icon class="text-rose-400 text-3xl">search_off</mat-icon>
            <p class="text-rose-300 font-semibold mt-2">No item found for "{{ barcodeInput }}"</p>
            <a routerLink="/inventory/items/new" class="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">+ Create new item</a>
          </div>
        }

        @if (item()) {
          <div class="bg-slate-900/60 border border-indigo-500/30 rounded-xl p-6 space-y-5">
            <!-- Item Header -->
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-lg font-bold text-white">{{ item()!.name }}</h2>
                <div class="flex items-center gap-3 mt-1">
                  <span class="font-mono text-xs text-indigo-300">{{ item()!.sku || '—' }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded uppercase font-bold"
                        [class]="item()!.itemType === 'goods' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'">
                    {{ item()!.itemType }}
                  </span>
                  @if (item()!.hsnSacCode) {
                    <span class="text-xs text-slate-400 font-mono">HSN: {{ item()!.hsnSacCode }}</span>
                  }
                </div>
              </div>
              <span class="text-xs px-2 py-1 rounded-full font-bold"
                    [class]="item()!.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'">
                {{ item()!.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- Pricing -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-slate-800/60 rounded-lg p-3 text-center">
                <div class="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Selling Price</div>
                <div class="text-lg font-mono font-bold text-emerald-400">₹{{ item()!.sellingPrice | number:'1.2-2' }}</div>
              </div>
              <div class="bg-slate-800/60 rounded-lg p-3 text-center">
                <div class="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Purchase Price</div>
                <div class="text-lg font-mono font-bold text-white">₹{{ item()!.purchasePrice | number:'1.2-2' }}</div>
              </div>
              <div class="bg-slate-800/60 rounded-lg p-3 text-center">
                <div class="text-[10px] text-slate-400 uppercase tracking-wide mb-1">GST Rate</div>
                <div class="text-lg font-mono font-bold text-amber-400">{{ item()!.gstRate }}%</div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-3 gap-3">
              <a [routerLink]="['/inventory/items', item()!.id, 'edit']"
                 class="flex flex-col items-center gap-1.5 p-3 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 rounded-lg transition-all text-center">
                <mat-icon class="text-indigo-400">edit</mat-icon>
                <span class="text-xs font-semibold text-indigo-300">Edit Item</span>
              </a>
              <a [routerLink]="['/inventory/ledger']" [queryParams]="{ itemId: item()!.id }"
                 class="flex flex-col items-center gap-1.5 p-3 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/20 rounded-lg transition-all text-center">
                <mat-icon class="text-slate-400">history</mat-icon>
                <span class="text-xs font-semibold text-slate-300">View Ledger</span>
              </a>
              <a [routerLink]="['/inventory/purchase-orders/new']" [queryParams]="{ itemId: item()!.id }"
                 class="flex flex-col items-center gap-1.5 p-3 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/20 rounded-lg transition-all text-center">
                <mat-icon class="text-emerald-400">add_shopping_cart</mat-icon>
                <span class="text-xs font-semibold text-emerald-300">Add to PO</span>
              </a>
            </div>

            <!-- Clear -->
            <button (click)="clearResult()" class="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
              × Clear and scan another
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class BarcodeScannerComponent {
  private service = inject(InventoryService);

  barcodeInput = '';
  item = signal<any>(null);
  searching = signal(false);
  notFound = signal(false);

  lookup() {
    const barcode = this.barcodeInput.trim();
    if (!barcode) return;
    this.searching.set(true);
    this.notFound.set(false);
    this.item.set(null);
    this.service.getItemByBarcode(barcode).subscribe({
      next: (res: any) => {
        this.item.set(res.data ?? null);
        if (!res.data) this.notFound.set(true);
        this.searching.set(false);
      },
      error: () => { this.notFound.set(true); this.searching.set(false); },
    });
  }

  clearResult() {
    this.item.set(null);
    this.notFound.set(false);
    this.barcodeInput = '';
  }
}
