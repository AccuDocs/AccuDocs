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
    <div class="animate-in fade-in slide-in-from-bottom-4 p-6 duration-500 bg-[#f8fafd] min-h-screen">
      <div class="space-y-6">
        <!-- Tally Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-[#0f2540] pb-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-2 rounded bg-[#0f2540] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#7ec8f0]">
              Inventory Master
            </div>
            <h1 class="text-2xl font-black tracking-tight text-[#0f2540] uppercase">Item Master</h1>
          </div>

          <div class="flex items-center gap-3">
            <button (click)="resetFilters()"
                    class="inline-flex items-center gap-2 rounded border border-[#0f2540] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#0f2540] hover:bg-[#dde8f2] transition-all">
              Reset Filters
            </button>
            <button routerLink="/inventory/items/new"
                    type="button"
                    class="inline-flex items-center gap-2 rounded bg-[#1a3a5c] px-6 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md transition-all hover:bg-[#0f2540] active:scale-[0.97]">
              <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> [F2] Add Item
            </button>
          </div>
        </div>

        <!-- Filter Bar - Accounting Style -->
        <form class="flex flex-wrap items-center gap-4 rounded border border-[#d0dde8] bg-[#dde8f2] p-3 shadow-sm">
          <div class="relative min-w-[200px] flex-1">
            <input
              type="text"
              [(ngModel)]="search"
              (ngModelChange)="onSearch()"
              name="search"
              placeholder="Search (SKU, Name, Barcode)..."
              class="w-full rounded border border-[#b8c9d9] bg-white px-3 py-1.5 text-xs font-bold text-[#0f2540] outline-none placeholder:text-slate-400 focus:border-[#1a3a5c]"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase text-[#5a7a9a]">Type:</span>
            <select [(ngModel)]="filterType" (ngModelChange)="load()" name="type"
                    class="rounded border border-[#b8c9d9] bg-white px-2 py-1.5 text-xs font-bold text-[#0f2540] outline-none focus:border-[#1a3a5c]">
              <option value="">All</option>
              <option value="goods">Goods</option>
              <option value="service">Services</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase text-[#5a7a9a]">Status:</span>
            <select [(ngModel)]="filterActive" (ngModelChange)="load()" name="active"
                    class="rounded border border-[#b8c9d9] bg-white px-2 py-1.5 text-xs font-bold text-[#0f2540] outline-none focus:border-[#1a3a5c]">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </form>

        <!-- Table Container - Professional Accounting Style -->
        <div class="overflow-hidden rounded border border-[#d0dde8] bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[1200px] text-left border-collapse">
              <thead>
                <tr class="bg-[#2a5a84] text-white">
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-12">#</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-40">SKU / Code</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10">Item Name</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-32">HSN/SAC</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-20">Unit</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-32 text-right">Purchase ₹</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-32 text-right text-[#9be49b]">Selling ₹</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-20 text-center">GST %</th>
                  <th class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#eef3f9]">
                @if (loading()) {
                  @for (i of [1,2,3,4,5,6,7]; track i) {
                    <tr>
                      <td colspan="9" class="px-4 py-3">
                        <div class="h-5 bg-slate-200 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  }
                } @else if (items().length === 0) {
                  <tr>
                    <td colspan="9" class="py-16 text-center text-slate-500">
                      <p class="text-4xl mb-3">📦</p>
                      <p class="font-semibold text-[#0f2540]">No items found</p>
                      <a routerLink="/inventory/items/new" class="text-[#1a3a5c] hover:underline text-sm mt-1 inline-block font-bold">
                        Create your first item →
                      </a>
                    </td>
                  </tr>
                } @else {
                  @for (item of items(); track item.id; let idx = $index) {
                    <tr class="group cursor-pointer hover:bg-[#e8f4fd] transition-colors" [class.bg-[#fcfdff]]="true">
                      <td class="px-4 py-3 text-[11px] font-bold text-slate-400 border-r border-[#eef3f9]">{{ (page() - 1) * pageSize + idx + 1 }}</td>
                      <td class="px-4 py-3 border-r border-[#eef3f9]">
                        <div class="font-mono text-xs font-black text-[#1a3a5c]">{{ item.sku || '—' }}</div>
                        @if (item.barcode) {
                          <div class="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">{{ item.barcode }}</div>
                        }
                      </td>
                      <td class="px-4 py-3 border-r border-[#eef3f9]">
                        <div class="font-bold text-[#0f2540] text-xs">{{ item.name }}</div>
                        <div class="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                          {{ item.itemType === 'goods' ? 'Goods' : 'Service' }}
                        </div>
                      </td>
                      <td class="px-4 py-3 font-mono text-[#0f2540] text-[11px] font-bold border-r border-[#eef3f9]">{{ item.hsnSacCode || '—' }}</td>
                      <td class="px-4 py-3 text-[#0f2540] text-[11px] font-bold border-r border-[#eef3f9]">{{ item.unitOfMeasure }}</td>
                      <td class="px-4 py-3 text-right border-r border-[#eef3f9] font-mono font-bold text-xs text-[#0f2540]">₹{{ item.purchasePrice | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-right border-r border-[#eef3f9] font-mono font-bold text-xs text-[#1a6e1a]">₹{{ item.sellingPrice | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-center text-[#0f2540] font-bold text-xs border-r border-[#eef3f9]">{{ item.gstRate }}%</td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded border"
                              [class]="item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
                          {{ item.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="flex items-center justify-center gap-1">
                          <a [routerLink]="['/inventory/items', item.id, 'edit']"
                             class="p-1 hover:bg-[#1a3a5c] rounded text-[#0f2540] hover:text-white transition-all" title="Edit">
                            <mat-icon class="text-[16px] w-4 h-4">edit</mat-icon>
                          </a>
                          <button (click)="deactivate(item)"
                                  class="p-1 hover:bg-rose-600 rounded text-[#0f2540] hover:text-white transition-all" title="Deactivate">
                            <mat-icon class="text-[16px] w-4 h-4">block</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
              <!-- Sticky Footer Totals -->
              <tfoot class="sticky bottom-0 bg-[#dde8f2] border-t-2 border-[#1a3a5c]">
                <tr>
                  <td colspan="7" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#1a3a5c] text-right">Page Totals:</td>
                  <td class="px-4 py-2 text-right font-mono font-black text-xs text-[#0f2540]">{{ total() }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Pagination - Accounting Style -->
        @if (total() > pageSize) {
          <div class="flex items-center justify-between px-4 py-3 rounded border border-[#d0dde8] bg-[#dde8f2] text-xs text-[#0f2540] font-bold">
            <span>Showing {{ (page() - 1) * pageSize + 1 }}–{{ min(page() * pageSize, total()) }} of {{ total() }} items</span>
            <div class="flex gap-2">
              <button (click)="prevPage()" [disabled]="page() === 1"
                      class="px-3 py-1.5 rounded bg-[#1a3a5c] text-white hover:bg-[#0f2540] disabled:opacity-40 transition-all text-[10px] font-bold uppercase">← Prev</button>
              <button (click)="nextPage()" [disabled]="page() * pageSize >= total()"
                      class="px-3 py-1.5 rounded bg-[#1a3a5c] text-white hover:bg-[#0f2540] disabled:opacity-40 transition-all text-[10px] font-bold uppercase">Next →</button>
            </div>
          </div>
        }

        <!-- Right Sidebar Summary -->
        <div class="w-full xl:w-72 space-y-6">
          <div class="rounded border border-[#d0dde8] bg-white overflow-hidden shadow-sm">
            <div class="bg-[#1a3a5c] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
              Master Summary
            </div>
            <div class="p-4 space-y-4">
              <div>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Items</p>
                <p class="font-mono font-black text-lg text-[#0f2540]">{{ total() }}</p>
              </div>
              <div class="pt-3 border-t border-[#eef3f9]">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Items</p>
                <p class="font-mono font-black text-lg text-[#1a6e1a]">{{ activeCount() }}</p>
              </div>
              <div class="pt-3 border-t-2 border-[#1a3a5c]">
                <p class="text-[9px] font-bold text-[#b91c1c] uppercase tracking-widest">Inactive</p>
                <p class="font-mono font-black text-xl text-[#b91c1c]">{{ inactiveCount() }}</p>
              </div>
            </div>
          </div>
        </div>
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

  // Computed signals for sidebar summary
  activeCount = () => this.items().filter(i => i.isActive).length;
  inactiveCount = () => this.items().filter(i => !i.isActive).length;

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
        this.total.set(res.meta?.total ?? res.total ?? 0);
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
