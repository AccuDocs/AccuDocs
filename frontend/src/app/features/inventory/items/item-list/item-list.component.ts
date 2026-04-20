import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { Item } from '../../models/inventory.models';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/inventory" class="text-slate-400 hover:text-white transition-colors">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h1 class="text-xl font-bold">Item Catalog</h1>
          <span class="bg-indigo-600/30 text-indigo-300 text-xs px-2 py-0.5 rounded-full font-mono">
            {{ total() }} items
          </span>
        </div>
        <a routerLink="/inventory/items/new"
           class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-all">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New Item
        </a>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <input type="text" [(ngModel)]="search" (ngModelChange)="onSearch()"
               placeholder="Search name, SKU, barcode…"
               class="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"/>

        <select [(ngModel)]="filterType" (ngModelChange)="load()"
                class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-[120px] focus:outline-none focus:border-indigo-500">
          <option value="">All Types</option>
          <option value="goods">Goods</option>
          <option value="service">Services</option>
        </select>

        <select [(ngModel)]="filterActive" (ngModelChange)="load()"
                class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-[120px] focus:outline-none focus:border-indigo-500">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button (click)="resetFilters()"
                class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all">
          Reset
        </button>
      </div>

      <!-- Table -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">SKU</th>
                <th class="px-4 py-3 text-left">Name</th>
                <th class="px-4 py-3 text-left">HSN/SAC</th>
                <th class="px-4 py-3 text-left">Unit</th>
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-right">Purchase ₹</th>
                <th class="px-4 py-3 text-right">Selling ₹</th>
                <th class="px-4 py-3 text-center">GST %</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @if (loading()) {
                @for (i of [1,2,3,4,5,6,7]; track i) {
                  <tr>
                    <td colspan="10" class="px-4 py-3">
                      <div class="h-5 bg-slate-800 rounded animate-pulse"></div>
                    </td>
                  </tr>
                }
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="10" class="py-16 text-center text-slate-500">
                    <p class="text-4xl mb-3">📦</p>
                    <p class="font-semibold">No items found</p>
                    <a routerLink="/inventory/items/new" class="text-indigo-400 hover:text-indigo-300 text-sm mt-1 inline-block">
                      Create your first item →
                    </a>
                  </td>
                </tr>
              } @else {
                @for (item of items(); track item.id) {
                  <tr class="hover:bg-slate-800/40 transition-colors group">
                    <td class="px-4 py-3 font-mono text-[11px] text-indigo-300">{{ item.sku || '—' }}</td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-white">{{ item.name }}</div>
                      @if (item.barcode) {
                        <div class="text-[10px] text-slate-500 font-mono">{{ item.barcode }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 font-mono text-slate-400 text-[11px]">{{ item.hsnSacCode || '—' }}</td>
                    <td class="px-4 py-3 text-slate-300">{{ item.unitOfMeasure }}</td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                            [class]="item.itemType === 'goods' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'">
                        {{ item.itemType }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-mono text-slate-300">₹{{ item.purchasePrice | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">₹{{ item.sellingPrice | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-center text-slate-400">{{ item.gstRate }}%</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            [class]="item.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'">
                        {{ item.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a [routerLink]="['/inventory/items', item.id, 'edit']"
                           class="p-1 hover:bg-indigo-600/30 rounded text-indigo-400 hover:text-indigo-300 transition-all" title="Edit">
                          <mat-icon class="text-[16px] w-4 h-4">edit</mat-icon>
                        </a>
                        <button (click)="deactivate(item)"
                                class="p-1 hover:bg-rose-600/30 rounded text-rose-400 hover:text-rose-300 transition-all" title="Deactivate">
                          <mat-icon class="text-[16px] w-4 h-4">block</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (total() > pageSize) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
            <span>Showing {{ (page() - 1) * pageSize + 1 }}–{{ min(page() * pageSize, total()) }} of {{ total() }}</span>
            <div class="flex gap-2">
              <button (click)="prevPage()" [disabled]="page() === 1"
                      class="px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-40 transition-all">← Prev</button>
              <button (click)="nextPage()" [disabled]="page() * pageSize >= total()"
                      class="px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-40 transition-all">Next →</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ItemListComponent implements OnInit {
  private service = inject(InventoryService);

  items = signal<Item[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = 50;

  search = '';
  filterType = '';
  filterActive = '';

  private searchTimer: any;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const filters: any = {
      page: this.page(), limit: this.pageSize,
      ...(this.search     ? { search: this.search }     : {}),
      ...(this.filterType ? { itemType: this.filterType } : {}),
      ...(this.filterActive !== '' ? { isActive: this.filterActive === 'true' } : {}),
    };
    this.service.getItems(filters).subscribe({
      next: (res: any) => {
        this.items.set(res.data ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 350);
  }

  resetFilters() {
    this.search = '';
    this.filterType = '';
    this.filterActive = '';
    this.page.set(1);
    this.load();
  }

  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() * this.pageSize < this.total()) { this.page.update(p => p + 1); this.load(); } }
  min(a: number, b: number) { return Math.min(a, b); }

  deactivate(item: Item) {
    if (confirm(`Deactivate "${item.name}"?`)) {
      this.service.deleteItem(item.id).subscribe({ next: () => this.load() });
    }
  }
}
