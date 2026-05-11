import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges, effect, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArchiveBoxSolid, heroPlusSolid, heroArrowPathSolid,
  heroTruckSolid, heroDocumentTextSolid,
  heroArrowTrendingUpSolid, heroArrowTrendingDownSolid,
  heroExclamationTriangleSolid, heroMagnifyingGlassSolid,
  heroCurrencyRupeeSolid, heroArrowLeftSolid,
  heroChevronRightSolid, heroCheckCircleSolid
} from '@ng-icons/heroicons/solid';
import { InventoryService } from '@core/services/inventory.service';
import { ItemFormComponent } from '../../../inventory/items/item-form/item-form.component';
import { PoFormComponent } from '../../../inventory/purchase-orders/po-form/po-form.component';
import { TransferFormComponent } from '../../../inventory/stock-transfers/transfer-form/transfer-form.component';
import { CategoryManagerComponent } from '../../../inventory/categories/category-manager.component';
import { DashboardToolbarComponent } from '../../../inventory/components/header/dashboard-toolbar/dashboard-toolbar.component';
import { InventoryKpiCardsComponent } from '../../../inventory/components/kpis/inventory-kpi-cards/inventory-kpi-cards.component';
import { LowStockAlertWidgetComponent } from '../../../inventory/components/inventory/low-stock-alert-widget/low-stock-alert-widget.component';
import { WarehousePerformanceWidgetComponent } from '../../../inventory/components/inventory/warehouse-performance-widget/warehouse-performance-widget.component';
import { RecentStockActivityWidgetComponent } from '../../../inventory/components/inventory/recent-stock-activity-widget/recent-stock-activity-widget.component';
import { SystemWarningWidgetComponent } from '../../../inventory/components/monitoring/system-warning-widget/system-warning-widget.component';
import { QuickActionsWidgetComponent } from '../../../inventory/components/actions/quick-actions-widget/quick-actions-widget.component';
import type { InventoryKpi, QuickAction, SystemWarning, WarehousePerformanceRow } from '../../../inventory/models/inventory-dashboard.models';
import { heroTagSolid } from '@ng-icons/heroicons/solid';
type InventoryView = 'overview' | 'items' | 'categories' | 'warehouses' | 'purchase-orders' | 'transfers' | 'ledger' | 'low-stock';

@Component({
  selector: 'app-client-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgIconComponent,
    DecimalPipe,
    DatePipe,
    ItemFormComponent,
    PoFormComponent,
    TransferFormComponent,
    CategoryManagerComponent,
    DashboardToolbarComponent,
    InventoryKpiCardsComponent,
    LowStockAlertWidgetComponent,
    WarehousePerformanceWidgetComponent,
    RecentStockActivityWidgetComponent,
    SystemWarningWidgetComponent,
    QuickActionsWidgetComponent,
  ],
  providers: [provideIcons({
    heroArchiveBoxSolid, heroPlusSolid, heroArrowPathSolid,
    heroTruckSolid, heroDocumentTextSolid,
    heroArrowTrendingUpSolid, heroArrowTrendingDownSolid,
    heroExclamationTriangleSolid, heroMagnifyingGlassSolid,
    heroCurrencyRupeeSolid, heroArrowLeftSolid,
    heroChevronRightSolid, heroCheckCircleSolid, heroTagSolid
  })],
  template: `
    <div class="client-inventory-shell w-full min-w-0 max-w-none animate-in fade-in duration-500">
      <!-- Sub-Navigation Tabs -->
      <div class="inventory-tabs no-scrollbar mb-6 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
        <button (click)="activeView.set('overview')"
                [class]="activeView() === 'overview' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroArchiveBoxSolid"></ng-icon> Overview
        </button>
        <button (click)="activeView.set('items')"
                [class]="activeView() === 'items' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroDocumentTextSolid"></ng-icon> Items
        </button>
        <button (click)="activeView.set('categories')"
                [class]="activeView() === 'categories' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroTagSolid"></ng-icon> Categories
        </button>
        <button (click)="activeView.set('warehouses')"
                [class]="activeView() === 'warehouses' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroArchiveBoxSolid"></ng-icon> Warehouses
        </button>
        <button (click)="activeView.set('purchase-orders')"
                [class]="activeView() === 'purchase-orders' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroTruckSolid"></ng-icon> Purchase Orders
        </button>
        <button (click)="activeView.set('transfers')"
                [class]="activeView() === 'transfers' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroArrowPathSolid"></ng-icon> Transfers
        </button>
        <button (click)="activeView.set('ledger')"
                [class]="activeView() === 'ledger' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroCurrencyRupeeSolid"></ng-icon> Ledger
        </button>
        <button (click)="activeView.set('low-stock')"
                [class]="activeView() === 'low-stock' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap">
          <ng-icon name="heroExclamationTriangleSolid"></ng-icon> Low Stock
        </button>
      </div>

      <!-- ═══ OVERVIEW TAB ═══ -->
      @if (activeView() === 'overview') {
        <section class="inventory-overview space-y-5">
          <app-dashboard-toolbar
            [loading]="isLoading()"
            [lastUpdated]="lastUpdated()"
            (refresh)="refresh()">
          </app-dashboard-toolbar>

          <app-inventory-kpi-cards [cards]="overviewKpiCards()" [loading]="isLoading()"></app-inventory-kpi-cards>

          <app-quick-actions-widget [actions]="quickActions"></app-quick-actions-widget>

          <div class="inventory-support-grid grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
            <app-low-stock-alert-widget [alerts]="lowStockAlerts()" [loading]="isLoading()"></app-low-stock-alert-widget>
            <app-warehouse-performance-widget
              [warehouses]="warehousePerformanceRows()"
              [loading]="isLoading()">
            </app-warehouse-performance-widget>
            <app-system-warning-widget [warnings]="systemWarnings()" [loading]="isLoading()"></app-system-warning-widget>
          </div>

          <app-recent-stock-activity-widget
            [movements]="recentMovements()"
            [loading]="isLoading()">
          </app-recent-stock-activity-widget>
        </section>

        @if (false) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Inventory & Stock</h1>
            <p class="text-sm text-slate-500 font-medium">Real-time stock overview, valuation, and movement tracking.</p>
            <div class="w-10 h-[3px] bg-primary-600 rounded-full mt-2"></div>
          </div>
          <button (click)="refresh()" class="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm">
            <ng-icon name="heroArrowPathSolid" size="16"></ng-icon> Refresh Data
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="sa-card group">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[13px] font-medium text-slate-500 mb-1">Total SKUs</p>
                @if (isLoading()) { <div class="h-8 w-20 bg-slate-100 rounded animate-pulse"></div> }
                @else { <h3 class="text-2xl font-bold text-slate-900">{{ totalItems() }}</h3> }
              </div>
              <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                <ng-icon name="heroArchiveBoxSolid" size="24"></ng-icon>
              </div>
            </div>
          </div>
          <div class="sa-card group">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[13px] font-medium text-slate-500 mb-1">Stock Value</p>
                @if (isLoading()) { <div class="h-8 w-28 bg-slate-100 rounded animate-pulse"></div> }
                @else { <h3 class="text-2xl font-bold text-emerald-700">₹{{ stockValue() | number:'1.0-0' }}</h3> }
              </div>
              <div class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                <ng-icon name="heroCurrencyRupeeSolid" size="24"></ng-icon>
              </div>
            </div>
          </div>
          <div class="sa-card group">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[13px] font-medium text-slate-500 mb-1">Low Stock Alerts</p>
                @if (isLoading()) { <div class="h-8 w-16 bg-slate-100 rounded animate-pulse"></div> }
                @else {
                  <h3 class="text-2xl font-bold" [class]="lowStockCount() > 0 ? 'text-amber-700' : 'text-slate-900'">{{ lowStockCount() }}</h3>
                  @if (outOfStockCount() > 0) {
                    <p class="text-[10px] font-bold text-rose-600 mt-1 uppercase tracking-wider">{{ outOfStockCount() }} out of stock</p>
                  }
                }
              </div>
              <div class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                <ng-icon name="heroExclamationTriangleSolid" size="24"></ng-icon>
              </div>
            </div>
          </div>
          <div class="sa-card group">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[13px] font-medium text-slate-500 mb-1">Pending POs</p>
                @if (isLoading()) { <div class="h-8 w-16 bg-slate-100 rounded animate-pulse"></div> }
                @else { <h3 class="text-2xl font-bold text-indigo-700">{{ pendingPOs() }}</h3> }
              </div>
              <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                <ng-icon name="heroTruckSolid" size="24"></ng-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Top 10 Valuation + Recent Movements -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Top 10 by Value -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 class="font-semibold text-slate-800">Top 10 by Value</h3>
              <button (click)="activeView.set('items')" class="text-xs font-bold text-primary-600 hover:underline">View All →</button>
            </div>
            @if (isLoading()) {
              <div class="p-4 space-y-3">
                @for (i of [1,2,3,4,5]; track i) { <div class="h-8 bg-slate-100 rounded animate-pulse"></div> }
              </div>
            } @else {
              <div class="divide-y divide-slate-100">
                @for (row of valuationRows(); track $index) {
                  <div class="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-slate-800 truncate">{{ row.itemName }}</p>
                      <p class="text-[11px] text-slate-500">{{ row.qtyOnHand }} {{ row.uom }}</p>
                    </div>
                    <p class="text-sm font-bold text-emerald-700 ml-4">₹{{ row.stockValue | number:'1.0-0' }}</p>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400 text-sm">No stock data yet</div>
                }
              </div>
            }
          </div>

          <!-- Recent Movements -->
          <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 class="font-semibold text-slate-800">Recent Stock Movements</h3>
              <button (click)="activeView.set('ledger')" class="text-xs font-bold text-primary-600 hover:underline">Full Ledger →</button>
            </div>
            <div class="overflow-x-auto no-scrollbar">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-white border-b border-slate-100">
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty In</th>
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty Out</th>
                    <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @if (isLoading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                      <tr><td colspan="6" class="py-3 px-4"><div class="h-5 bg-slate-100 rounded animate-pulse"></div></td></tr>
                    }
                  } @else {
                    @for (entry of recentMovements(); track entry.id) {
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 text-sm text-slate-600 font-mono whitespace-nowrap">{{ entry.transactionDate | date:'dd MMM' }}</td>
                        <td class="py-3 px-4 text-sm text-slate-800 font-medium truncate max-w-[200px]">{{ entry.item?.name || entry.itemId }}</td>
                        <td class="py-3 px-4">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                                [ngClass]="{
                                  'bg-emerald-50 text-emerald-700': entry.transactionType === 'purchase',
                                  'bg-blue-50 text-blue-700': entry.transactionType === 'sale',
                                  'bg-indigo-50 text-indigo-700': entry.transactionType === 'transfer_in',
                                  'bg-orange-50 text-orange-700': entry.transactionType === 'transfer_out',
                                  'bg-slate-100 text-slate-600': entry.transactionType === 'adjustment',
                                  'bg-purple-50 text-purple-700': entry.transactionType === 'opening_stock'
                                }">
                            {{ entry.transactionType.replace('_', ' ') }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-emerald-600">{{ entry.qtyIn || '-' }}</td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-rose-600">{{ entry.qtyOut || '-' }}</td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-slate-900">{{ entry.runningBalance }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="py-12 text-center">
                          <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ng-icon name="heroArchiveBoxSolid" size="32"></ng-icon>
                          </div>
                          <h3 class="text-lg font-bold text-slate-700">No movements yet</h3>
                          <p class="text-slate-500 max-w-sm mx-auto mt-2">Stock movements will appear here as purchases, sales, and transfers are recorded.</p>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

      <!-- ═══ ITEMS TAB ═══ -->
        }
      } @else if (activeView() === 'items') {
        @if (showItemForm) {
          <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
             <app-item-form
               [inlineMode]="true"
               [inlineId]="editingItemId()"
               (saved)="finishItemForm()"
               (cancelled)="cancelItemForm()">
             </app-item-form>
          </div>
        } @else {
          <section class="space-y-5">
            <div class="rounded-3xl border border-primary-200 bg-gradient-to-br from-white via-primary-50/40 to-white p-5 shadow-sm">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                    <ng-icon name="heroArchiveBoxSolid" size="14"></ng-icon>
                    Product catalog
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Item Catalog</h2>
                  <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Manage products, stock visibility, pricing, margins, categories, and barcode-ready SKU records for this client workspace.
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <button type="button"
                          (click)="reloadItemCatalog()"
                          class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          [disabled]="isLoadingItems()">
                    <ng-icon name="heroArrowPathSolid" size="17" [class]="isLoadingItems() ? 'animate-spin' : ''"></ng-icon>
                    Refresh
                  </button>
                  <button (click)="openNewItemForm()" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary-700">
                    <ng-icon name="heroPlusSolid" size="18"></ng-icon> New Item
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Catalog Items</p>
                <p class="mt-4 text-3xl font-black text-slate-950">{{ itemCatalogStats().total }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500">{{ filteredItems().length }} visible after filters</p>
              </article>
              <article class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Stock Value</p>
                <p class="mt-4 text-3xl font-black text-emerald-700">₹{{ itemCatalogStats().stockValue | number:'1.0-0' }}</p>
                <p class="mt-1 text-xs font-semibold text-emerald-700/70">{{ itemCatalogStats().stocked }} stock-tracked item(s)</p>
              </article>
              <article class="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Low Stock</p>
                <p class="mt-4 text-3xl font-black text-amber-700">{{ itemCatalogStats().lowStock }}</p>
                <p class="mt-1 text-xs font-semibold text-amber-700/70">{{ itemCatalogStats().outOfStock }} out of stock</p>
              </article>
              <article class="rounded-2xl border border-primary-100 bg-primary-50/50 p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Avg Margin</p>
                <p class="mt-4 text-3xl font-black text-primary-700">{{ itemCatalogStats().avgMargin | number:'1.0-1' }}%</p>
                <p class="mt-1 text-xs font-semibold text-primary-700/70">Selling price vs purchase price</p>
              </article>
            </div>

          <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 class="text-base font-black text-slate-900">All Items</h3>
                  <p class="mt-1 text-sm text-slate-500">Search by item, SKU, barcode, category, stock status, or warehouse.</p>
                </div>
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label class="relative block lg:w-72">
                    <ng-icon name="heroMagnifyingGlassSolid" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="16"></ng-icon>
                    <input type="search" [(ngModel)]="itemSearch" (ngModelChange)="searchItems()" placeholder="Search item, SKU, barcode..."
                           class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100" />
                  </label>
                  <select [ngModel]="itemCategoryFilter()" (ngModelChange)="itemCategoryFilter.set($event)"
                          class="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100">
                    <option value="">All categories</option>
                    @for (category of itemCategoryOptions(); track category.id) {
                      <option [value]="category.id">{{ category.name }}</option>
                    }
                  </select>
                  <select [ngModel]="itemStockFilter()" (ngModelChange)="itemStockFilter.set($event)"
                          class="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100">
                    <option value="">All stock</option>
                    <option value="in_stock">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="not_tracked">Not tracked</option>
                  </select>
                  <select [ngModel]="itemWarehouseFilter()" (ngModelChange)="itemWarehouseFilter.set($event); loadCatalogValuation()"
                          class="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100">
                    <option value="">All warehouses</option>
                    @for (warehouse of warehouses(); track warehouse.id) {
                      <option [value]="warehouse.id">{{ warehouse.name }}</option>
                    }
                  </select>
                  @if (hasItemFilters()) {
                    <button type="button" (click)="clearItemFilters()"
                            class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
                      Clear
                    </button>
                  }
                </div>
              </div>
            </div>
            @if (isLoadingItems()) {
              <div class="p-12 text-center text-slate-500">
                <div class="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3"></div>
                Loading items...
              </div>
            } @else if (items().length === 0) {
              <div class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ng-icon name="heroArchiveBoxSolid" size="32"></ng-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-700">No items yet</h3>
                <p class="text-slate-500 max-w-sm mx-auto mt-2">Your product catalog is empty. Items will appear here once created.</p>
              </div>
            } @else if (filteredItems().length === 0) {
              <div class="p-12 text-center">
                <h3 class="text-lg font-bold text-slate-700">No matching items</h3>
                <p class="text-slate-500 max-w-sm mx-auto mt-2">Try clearing filters or searching a different product, SKU, or barcode.</p>
              </div>
            } @else {
              <div class="overflow-x-auto no-scrollbar">
                <table class="min-w-[1180px] w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">Item</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">Category</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">SKU / Barcode</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-right">Available</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-right">Purchase</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-right">Selling</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-right">Margin</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-center">Status</th>
                      <th class="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of filteredItems(); track item.id) {
                      <tr class="hover:bg-slate-50/70 transition-colors group cursor-pointer" (click)="selectCatalogItem(item)">
                        <td class="py-3 px-4">
                          <div class="font-bold text-slate-900 text-sm">{{ item.name }}</div>
                          @if (item.barcode) { <div class="text-[11px] text-slate-400 font-mono mt-0.5">{{ item.barcode }}</div> }
                        </td>
                        <td class="py-3 px-4">
                          <span class="inline-flex max-w-[180px] items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            <span class="truncate">{{ itemCategoryName(item) }}</span>
                          </span>
                        </td>
                        <td class="py-3 px-4 text-sm text-slate-600 font-mono">{{ item.sku || '—' }}</td>
                        <td class="py-3 px-4 text-right">
                          <div class="font-mono text-sm font-black" [ngClass]="stockTextClass(item)">{{ itemStockAvailable(item) | number:'1.0-2' }}</div>
                          <span class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" [ngClass]="stockBadgeClass(item)">
                            {{ stockStatusLabel(item) }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-slate-700">₹{{ item.purchasePrice | number:'1.2-2' }}</td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-emerald-700">₹{{ item.sellingPrice | number:'1.2-2' }}</td>
                        <td class="py-3 px-4 text-right">
                          <div class="font-mono text-sm font-black" [ngClass]="itemMarginAmount(item) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                            ₹{{ itemMarginAmount(item) | number:'1.0-0' }}
                          </div>
                          <div class="text-[10px] font-bold text-slate-400">{{ itemMarginPct(item) | number:'1.0-1' }}%</div>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold"
                                [ngClass]="{'bg-emerald-100 text-emerald-700': item.isActive, 'bg-slate-100 text-slate-500': !item.isActive}">
                            {{ item.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right" (click)="$event.stopPropagation()">
                          <div class="flex justify-end gap-2">
                            <button type="button" (click)="selectCatalogItem(item)" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">View</button>
                            <button type="button" (click)="editCatalogItem(item)" class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100">Edit</button>
                            <button type="button" (click)="openItemLedger(item)" class="rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-700 transition hover:bg-primary-100">Ledger</button>
                            <button type="button" (click)="printBarcode(item)" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">Barcode</button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          @if (selectedCatalogItem()) {
            <div class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" (click)="selectedCatalogItem.set(null)"></div>
            <aside class="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl" (click)="$event.stopPropagation()">
              <div class="border-b border-slate-200 p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Item details</p>
                    <h3 class="mt-2 text-2xl font-black text-slate-950">{{ selectedCatalogItem()!.name }}</h3>
                    <p class="mt-1 font-mono text-xs font-bold text-slate-400">{{ selectedCatalogItem()!.sku || 'No SKU' }}</p>
                  </div>
                  <button type="button" (click)="selectedCatalogItem.set(null)" class="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200">Close</button>
                </div>
              </div>

              <div class="no-scrollbar flex-1 overflow-y-auto p-5">
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl bg-slate-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Available</p>
                    <p class="mt-2 font-mono text-2xl font-black" [ngClass]="stockTextClass(selectedCatalogItem()!)">{{ itemStockAvailable(selectedCatalogItem()!) | number:'1.0-2' }}</p>
                  </div>
                  <div class="rounded-2xl bg-emerald-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Selling</p>
                    <p class="mt-2 font-mono text-2xl font-black text-emerald-700">₹{{ selectedCatalogItem()!.sellingPrice | number:'1.0-0' }}</p>
                  </div>
                  <div class="rounded-2xl bg-primary-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">Margin</p>
                    <p class="mt-2 font-mono text-2xl font-black text-primary-700">{{ itemMarginPct(selectedCatalogItem()!) | number:'1.0-1' }}%</p>
                  </div>
                  <div class="rounded-2xl bg-amber-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">GST</p>
                    <p class="mt-2 font-mono text-2xl font-black text-amber-700">{{ selectedCatalogItem()!.gstRate || 0 }}%</p>
                  </div>
                </div>

                <div class="mt-5 space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div class="flex justify-between gap-4 text-sm">
                    <span class="font-bold text-slate-500">Category</span>
                    <span class="font-black text-slate-900">{{ itemCategoryName(selectedCatalogItem()!) }}</span>
                  </div>
                  <div class="flex justify-between gap-4 text-sm">
                    <span class="font-bold text-slate-500">Barcode</span>
                    <span class="font-mono font-black text-slate-900">{{ selectedCatalogItem()!.barcode || '-' }}</span>
                  </div>
                  <div class="flex justify-between gap-4 text-sm">
                    <span class="font-bold text-slate-500">Purchase price</span>
                    <span class="font-mono font-black text-slate-900">₹{{ selectedCatalogItem()!.purchasePrice | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between gap-4 text-sm">
                    <span class="font-bold text-slate-500">Reorder point</span>
                    <span class="font-mono font-black text-slate-900">{{ selectedCatalogItem()!.reorderPoint || 0 }}</span>
                  </div>
                  <div class="flex justify-between gap-4 text-sm">
                    <span class="font-bold text-slate-500">Tracking</span>
                    <span class="font-black" [ngClass]="selectedCatalogItem()!.trackInventory ? 'text-emerald-700' : 'text-slate-500'">{{ selectedCatalogItem()!.trackInventory ? 'Inventory tracked' : 'Not tracked' }}</span>
                  </div>
                </div>
              </div>

              <div class="border-t border-slate-200 p-5">
                <div class="flex gap-3">
                  <button type="button" (click)="editCatalogItem(selectedCatalogItem()!)" class="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700">Edit Item</button>
                  <button type="button" (click)="openItemLedger(selectedCatalogItem()!)" class="flex-1 rounded-xl bg-primary-600 px-4 py-3 text-sm font-black text-white transition hover:bg-primary-700">View Ledger</button>
                </div>
              </div>
            </aside>
          }
          </section>
        }

      <!-- ═══ CATEGORIES TAB ═══ -->
      } @else if (activeView() === 'categories') {
        <app-category-manager></app-category-manager>

      <!-- ═══ WAREHOUSES TAB ═══ -->
      } @else if (activeView() === 'warehouses') {
        @if(showWarehouseForm) {
          <div class="bg-slate-900/80 border border-indigo-500/30 rounded-lg p-6 mb-6">
            <h2 class="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4">New Warehouse</h2>
            <form [formGroup]="whForm" (ngSubmit)="createWarehouse()" class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="col-span-2">
                <label class="text-xs text-slate-400 mb-1.5 block">Name *</label>
                <input formControlName="name" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Main Warehouse"/>
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1.5 block">Code *</label>
                <input formControlName="code" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="WH-01"/>
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1.5 block">GSTIN</label>
                <input formControlName="gstin" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Optional"/>
              </div>
              <div class="col-span-2 md:col-span-4">
                <label class="text-xs text-slate-400 mb-1.5 block">Address</label>
                <input formControlName="address" type="text" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Full address"/>
              </div>
              <div class="flex gap-4 items-center col-span-2 md:col-span-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input formControlName="isDefault" type="checkbox" class="accent-indigo-500 w-4 h-4"/>
                  <span class="text-sm text-slate-300">Set as Default Warehouse</span>
                </label>
              </div>
              <div class="col-span-2 md:col-span-4 flex gap-3">
                <button type="submit" [disabled]="whForm.invalid" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50">Create</button>
                <button type="button" (click)="showWarehouseForm = false" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all">Cancel</button>
              </div>
            </form>
          </div>
        }
        <div class="flex items-center justify-between mb-6" [class.hidden]="showWarehouseForm">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Warehouses & Locations</h2>
            <p class="text-sm text-slate-500 mt-1">Manage storage locations and view per-warehouse stock.</p>
          </div>
          <button (click)="showWarehouseForm = true" class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-all shadow-sm">
             <ng-icon name="heroPlusSolid" size="16"></ng-icon> New Warehouse
          </button>
        </div>

        @if (isLoadingWarehouses()) {
          <div class="p-12 text-center text-slate-500">
            <div class="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3"></div>
            Loading warehouses...
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (wh of warehouses(); track wh.id) {
              <div class="sa-card group cursor-pointer" (click)="selectWarehouse(wh)">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h3 class="font-bold text-slate-900">{{ wh.name }}</h3>
                    <p class="text-[11px] font-mono text-slate-400 mt-0.5">{{ wh.code }}</p>
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        [ngClass]="{'bg-emerald-100 text-emerald-700': wh.isActive, 'bg-slate-100 text-slate-500': !wh.isActive}">
                    {{ wh.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                @if (wh.address) {
                  <p class="text-xs text-slate-500 line-clamp-2 mb-3">{{ wh.address }}</p>
                }
                @if (wh.gstin) {
                  <div class="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                    GSTIN: {{ wh.gstin }}
                  </div>
                }
                <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-xs text-primary-600 font-bold group-hover:underline">View Stock →</span>
                  @if (wh.isDefault) {
                    <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">DEFAULT</span>
                  }
                </div>
              </div>
            } @empty {
              <div class="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200">
                <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ng-icon name="heroArchiveBoxSolid" size="32"></ng-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-700">No warehouses yet</h3>
                <p class="text-slate-500 max-w-sm mx-auto mt-2">Set up your storage locations to start tracking stock.</p>
              </div>
            }
          </div>

          <!-- Warehouse Stock Detail -->
          @if (selectedWarehouse()) {
            <div class="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <button (click)="selectedWarehouse.set(null)" class="text-slate-400 hover:text-slate-700 transition-colors">
                    <ng-icon name="heroArrowLeftSolid" size="18"></ng-icon>
                  </button>
                  <h3 class="font-semibold text-slate-800">Stock at {{ selectedWarehouse()!.name }}</h3>
                </div>
              </div>
              @if (isLoadingWhStock()) {
                <div class="p-8 text-center text-slate-500">
                  <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-2"></div>
                  Loading stock...
                </div>
              } @else if (warehouseStock().length === 0) {
                <div class="p-8 text-center text-slate-400 text-sm">No stock entries for this warehouse</div>
              } @else {
                <div class="overflow-x-auto no-scrollbar">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-white border-b border-slate-100">
                        <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                        <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty On Hand</th>
                        <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Reserved</th>
                        <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Available</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (s of warehouseStock(); track s.itemId) {
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-3 px-4 text-sm font-medium text-slate-800">{{ s.item?.name || s.itemId }}</td>
                          <td class="py-3 px-4 text-right text-sm font-mono font-bold text-slate-700">{{ s.qtyOnHand }}</td>
                          <td class="py-3 px-4 text-right text-sm font-mono text-amber-600">{{ s.qtyReserved }}</td>
                          <td class="py-3 px-4 text-right text-sm font-mono font-bold text-emerald-700">{{ s.qtyAvailable }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        }

      <!-- ═══ PURCHASE ORDERS TAB ═══ -->
      } @else if (activeView() === 'purchase-orders') {
        @if(showPOForm) {
          <div class="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
            <app-po-form [inlineMode]="true" (saved)="showPOForm = false; loadPOs()" (cancelled)="showPOForm = false"></app-po-form>
          </div>
        } @else {
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-slate-900">Purchase Orders</h2>
              <p class="text-sm text-slate-500 mt-1">Track purchase orders and receiving status.</p>
            </div>
            <div class="flex gap-2">
              <select [(ngModel)]="poStatusFilter" (ngModelChange)="loadPOs()"
                      class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary-500 transition-all cursor-pointer">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button (click)="showPOForm = true" class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-all shadow-sm">
                <ng-icon name="heroPlusSolid" size="16"></ng-icon> New PO
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 bg-slate-50">
              <h3 class="font-semibold text-slate-800">Purchase Order History</h3>
            </div>
            @if (isLoadingPOs()) {
              <div class="p-12 text-center text-slate-500">
                <div class="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3"></div>
                Loading purchase orders...
              </div>
            } @else if (purchaseOrders().length === 0) {
              <div class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ng-icon name="heroTruckSolid" size="32"></ng-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-700">No purchase orders yet</h3>
                <p class="text-slate-500 max-w-sm mx-auto mt-2">Purchase orders will appear here as they are created.</p>
              </div>
            } @else {
              <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-white border-b border-slate-100">
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (po of purchaseOrders(); track po.id) {
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 text-sm font-bold text-primary-600">{{ po.poNumber }}</td>
                        <td class="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{{ po.poDate | date:'mediumDate' }}</td>
                        <td class="py-3 px-4 text-sm text-slate-700">{{ po.supplier?.user?.name || 'N/A' }}</td>
                        <td class="py-3 px-4 text-right text-sm font-mono font-bold text-slate-900">₹{{ po.total | number:'1.2-2' }}</td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold capitalize"
                                [ngClass]="{
                                  'bg-amber-100 text-amber-700': po.status === 'draft',
                                  'bg-blue-100 text-blue-700': po.status === 'sent',
                                  'bg-emerald-100 text-emerald-700': po.status === 'received',
                                  'bg-rose-100 text-rose-700': po.status === 'cancelled'
                                }">
                            {{ po.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

      <!-- ═══ TRANSFERS TAB ═══ -->
      } @else if (activeView() === 'transfers') {
        @if(showTransferForm) {
          <div class="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
            <app-transfer-form [inlineMode]="true" (saved)="showTransferForm = false; loadTransfers()" (cancelled)="showTransferForm = false"></app-transfer-form>
          </div>
        } @else {
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-slate-900">Stock Transfers</h2>
              <p class="text-sm text-slate-500 mt-1">Track inter-warehouse stock movements.</p>
            </div>
            <button (click)="showTransferForm = true" class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-all shadow-sm">
              <ng-icon name="heroPlusSolid" size="16"></ng-icon> New Transfer
            </button>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 bg-slate-50">
              <h3 class="font-semibold text-slate-800">Transfer History</h3>
            </div>
            @if (isLoadingTransfers()) {
              <div class="p-12 text-center text-slate-500">
                <div class="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3"></div>
                Loading transfers...
              </div>
            } @else if (transfers().length === 0) {
              <div class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ng-icon name="heroArrowPathSolid" size="32"></ng-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-700">No transfers yet</h3>
                <p class="text-slate-500 max-w-sm mx-auto mt-2">Stock transfers between warehouses will appear here.</p>
              </div>
            } @else {
              <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-white border-b border-slate-100">
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer #</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">From → To</th>
                      <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (tf of transfers(); track tf.id) {
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 px-4 text-sm font-bold text-primary-600">{{ tf.transferNumber }}</td>
                        <td class="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{{ tf.transferDate | date:'mediumDate' }}</td>
                        <td class="py-3 px-4 text-sm text-slate-700">
                          {{ tf.fromWarehouse?.name || 'N/A' }}
                          <ng-icon name="heroChevronRightSolid" size="12" class="inline text-slate-400 mx-1"></ng-icon>
                          {{ tf.toWarehouse?.name || 'N/A' }}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold capitalize"
                                [ngClass]="{
                                  'bg-amber-100 text-amber-700': tf.status === 'draft',
                                  'bg-blue-100 text-blue-700': tf.status === 'in_transit',
                                  'bg-emerald-100 text-emerald-700': tf.status === 'received',
                                  'bg-rose-100 text-rose-700': tf.status === 'cancelled'
                                }">
                            {{ tf.status?.replace('_', ' ') }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

      <!-- ═══ LEDGER TAB ═══ -->
      } @else if (activeView() === 'ledger') {
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Stock Ledger</h2>
            <p class="text-sm text-slate-500 mt-1">Complete history of all stock movements.</p>
          </div>
          <div class="flex gap-3">
            <select [(ngModel)]="ledgerTypeFilter" (ngModelChange)="loadLedger()"
                    class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary-500 transition-all cursor-pointer">
              <option value="">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="opening_stock">Opening Stock</option>
            </select>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto no-scrollbar">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Qty In</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Qty Out</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Rate</th>
                  <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Balance</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @if (isLoadingLedger()) {
                  @for (i of [1,2,3,4,5]; track i) {
                    <tr><td colspan="7" class="py-3 px-4"><div class="h-5 bg-slate-100 rounded animate-pulse"></div></td></tr>
                  }
                } @else {
                  @for (entry of ledgerEntries(); track entry.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-3.5 px-4 text-sm text-slate-600 font-mono whitespace-nowrap">{{ entry.transactionDate | date:'dd MMM yyyy' }}</td>
                      <td class="py-3.5 px-4 text-sm font-medium text-slate-800">{{ entry.item?.name || entry.itemId }}</td>
                      <td class="py-3.5 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                              [ngClass]="{
                                'bg-emerald-50 text-emerald-700': entry.transactionType === 'purchase',
                                'bg-blue-50 text-blue-700': entry.transactionType === 'sale',
                                'bg-indigo-50 text-indigo-700': entry.transactionType === 'transfer_in',
                                'bg-orange-50 text-orange-700': entry.transactionType === 'transfer_out',
                                'bg-slate-100 text-slate-600': entry.transactionType === 'adjustment',
                                'bg-purple-50 text-purple-700': entry.transactionType === 'opening_stock'
                              }">
                          {{ entry.transactionType.replace('_', ' ') }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right text-sm font-mono font-bold text-emerald-600">{{ entry.qtyIn || '-' }}</td>
                      <td class="py-3.5 px-4 text-right text-sm font-mono font-bold text-rose-600">{{ entry.qtyOut || '-' }}</td>
                      <td class="py-3.5 px-4 text-right text-sm font-mono text-slate-600">₹{{ entry.rate | number:'1.2-2' }}</td>
                      <td class="py-3.5 px-4 text-right text-sm font-mono font-bold text-slate-900">{{ entry.runningBalance }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-12 text-center text-slate-400">No ledger entries found</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

      <!-- ═══ LOW STOCK TAB ═══ -->
      } @else if (activeView() === 'low-stock') {
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Low Stock Alerts</h2>
            <p class="text-sm text-slate-500 mt-1">Items that need restocking attention.</p>
          </div>
        </div>

        @if (lowStockAlerts().length === 0 && !isLoading()) {
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div class="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ng-icon name="heroCheckCircleSolid" size="32"></ng-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-700">All stock levels are healthy</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">No items are below their reorder threshold.</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (alert of lowStockAlerts(); track alert.itemId) {
              <div class="sa-card flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                       [ngClass]="{
                         'bg-rose-50 text-rose-600': alert.severity === 'out_of_stock',
                         'bg-amber-50 text-amber-600': alert.severity === 'critical',
                         'bg-yellow-50 text-yellow-600': alert.severity === 'low'
                       }">
                    <ng-icon name="heroExclamationTriangleSolid" size="20"></ng-icon>
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm">{{ alert.itemName }}</p>
                    <p class="text-[11px] text-slate-500">SKU: {{ alert.sku || 'N/A' }} · Warehouse: {{ alert.warehouseName }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold" [ngClass]="{
                    'text-rose-700': alert.severity === 'out_of_stock',
                    'text-amber-700': alert.severity === 'critical',
                    'text-yellow-700': alert.severity === 'low'
                  }">
                    {{ alert.currentQty }} / {{ alert.reorderLevel }} {{ alert.uom }}
                  </p>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1"
                        [ngClass]="{
                          'bg-rose-100 text-rose-700': alert.severity === 'out_of_stock',
                          'bg-amber-100 text-amber-700': alert.severity === 'critical',
                          'bg-yellow-100 text-yellow-700': alert.severity === 'low'
                        }">
                    {{ alert.severity?.replace('_', ' ') }}
                  </span>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      overflow-x: hidden;
    }
    .client-inventory-shell {
      min-width: 0;
      max-width: 100%;
      color: #0f172a;
    }
    .inventory-tabs {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .inventory-tabs::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .inventory-tabs button {
      min-height: 36px;
    }
    .inventory-overview {
      min-width: 0;
      max-width: 100%;
    }
    .inventory-support-grid {
      min-width: 0;
      align-items: stretch;
    }
    .sa-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); transition: all .2s ease;
    }
    .sa-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px);
    }
  `]
})
export class ClientInventoryComponent implements OnInit, OnChanges {
  @Input() clientId = '';

  private inventoryService = inject(InventoryService);

  showItemForm = false;
  editingItemId = signal<string | null>(null);
  showPOForm = false;
  showTransferForm = false;

  activeView = signal<InventoryView>('overview');

  // Overview
  isLoading = signal(true);
  totalItems = signal(0);
  stockValue = signal(0);
  lowStockCount = signal(0);
  outOfStockCount = signal(0);
  pendingPOs = signal(0);
  valuationRows = signal<any[]>([]);
  recentMovements = signal<any[]>([]);
  lowStockAlerts = signal<any[]>([]);
  lastUpdated = signal<Date | null>(null);
  warehousePerformanceRows = signal<WarehousePerformanceRow[]>([]);
  defaultWarehouseCount = signal(0);

  quickActions: QuickAction[] = [
    {
      label: 'Add inventory item',
      description: 'Create SKU, barcode, GST, pricing, and stock rules.',
      icon: 'add_box',
      route: '/inventory/items/new',
      tone: 'blue',
    },
    {
      label: 'Create purchase order',
      description: 'Raise supplier PO for replenishment.',
      icon: 'receipt_long',
      route: '/inventory/purchase-orders/new',
      tone: 'green',
    },
    {
      label: 'Transfer stock',
      description: 'Move stock between store and warehouse.',
      icon: 'swap_horiz',
      route: '/inventory/transfers/new',
      tone: 'slate',
    },
    {
      label: 'Scan barcode',
      description: 'Lookup product stock by barcode or SKU.',
      icon: 'qr_code_scanner',
      route: '/inventory/scanner',
      tone: 'amber',
    },
  ];

  overviewKpiCards = computed<InventoryKpi[]>(() => {
    const totalUnits = this.warehousePerformanceRows().reduce((sum, row) => sum + row.qtyOnHand, 0);
    const alerts = this.lowStockAlerts();
    const outOfStock = alerts.filter((alert: any) => alert.severity === 'out_of_stock').length;

    return [
      {
        label: 'Total SKUs',
        value: String(this.totalItems()),
        icon: 'inventory_2',
        tone: 'blue',
        sub: `${this.formatShortNumber(totalUnits)} units on hand`,
      },
      {
        label: 'Stock Value',
        value: `INR ${this.formatMoneyShort(this.stockValue())}`,
        icon: 'payments',
        tone: 'green',
        sub: 'Weighted average valuation',
      },
      {
        label: 'Low Stock',
        value: String(this.lowStockCount()),
        icon: outOfStock > 0 ? 'error' : 'warning',
        tone: outOfStock > 0 ? 'red' : this.lowStockCount() > 0 ? 'amber' : 'green',
        sub: outOfStock > 0 ? `${outOfStock} out of stock` : 'Reorder watchlist',
      },
      {
        label: 'Pending POs',
        value: String(this.pendingPOs()),
        icon: 'local_shipping',
        tone: this.pendingPOs() > 0 ? 'amber' : 'slate',
        sub: 'Sent and awaiting receipt',
      },
    ];
  });

  systemWarnings = computed<SystemWarning[]>(() => {
    const warnings: SystemWarning[] = [];
    const alerts = this.lowStockAlerts();
    const outOfStock = alerts.filter((alert: any) => alert.severity === 'out_of_stock').length;

    if (outOfStock > 0) {
      warnings.push({
        title: 'Out-of-stock items detected',
        message: `${outOfStock} item(s) need replenishment before sale.`,
        severity: 'critical',
        icon: 'report',
        actionLabel: 'Open alerts',
        actionRoute: '/inventory/low-stock',
      });
    } else if (alerts.length > 0) {
      warnings.push({
        title: 'Reorder threshold reached',
        message: `${alerts.length} item(s) are at or below reorder point.`,
        severity: 'warning',
        icon: 'warning',
        actionLabel: 'Review low stock',
        actionRoute: '/inventory/low-stock',
      });
    }

    if (this.defaultWarehouseCount() > 1) {
      warnings.push({
        title: 'Multiple default warehouses',
        message: 'More than one warehouse is marked default. Invoice stock selection may become ambiguous.',
        severity: 'warning',
        icon: 'warehouse',
        actionLabel: 'Fix warehouses',
        actionRoute: '/inventory/warehouses',
      });
    }

    if (this.warehousePerformanceRows().length === 0) {
      warnings.push({
        title: 'No warehouse stock summary',
        message: 'Record opening stock to activate warehouse analytics.',
        severity: 'info',
        icon: 'inventory',
        actionLabel: 'Open warehouses',
        actionRoute: '/inventory/warehouses',
      });
    }

    return warnings;
  });

  // Items
  items = signal<any[]>([]);
  isLoadingItems = signal(false);
  itemSearch = '';
  itemCategoryFilter = signal('');
  itemStockFilter = signal('');
  itemWarehouseFilter = signal('');
  catalogValuationRows = signal<any[]>([]);
  selectedCatalogItem = signal<any | null>(null);

  itemStockIndex = computed(() => {
    const index = new Map<string, any>();
    for (const row of this.catalogValuationRows()) {
      if (row?.itemId) index.set(row.itemId, row);
    }
    return index;
  });

  lowStockItemIds = computed(() => {
    const ids = new Set<string>();
    for (const alert of this.lowStockAlerts()) {
      const id = alert.itemId ?? alert.item_id;
      if (id) ids.add(id);
    }
    return ids;
  });

  itemCategoryOptions = computed(() => {
    const categories = new Map<string, string>();
    for (const item of this.items()) {
      const id = item.categoryId ?? item.category_id ?? item.category?.id;
      const name = item.category?.name ?? item.categoryName ?? item.category_name;
      if (id && name) categories.set(id, name);
    }
    return [...categories.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredItems = computed(() => {
    const categoryId = this.itemCategoryFilter();
    const stockFilter = this.itemStockFilter();

    return this.items().filter((item) => {
      if (categoryId) {
        const itemCategoryId = item.categoryId ?? item.category_id ?? item.category?.id;
        if (itemCategoryId !== categoryId) return false;
      }

      if (stockFilter) {
        const status = this.itemStockStatus(item);
        if (status !== stockFilter) return false;
      }

      return true;
    });
  });

  itemCatalogStats = computed(() => {
    const rows = this.catalogValuationRows();
    const stockValue = rows.reduce((sum, row) => sum + Number(row.stockValue ?? 0), 0);
    const activeItems = this.items().filter((item) => item.isActive !== false);
    const marginTotal = activeItems.reduce((sum, item) => sum + this.itemMarginPct(item), 0);

    return {
      total: this.items().length,
      stocked: rows.filter((row) => Number(row.qtyOnHand ?? 0) > 0).length,
      stockValue,
      lowStock: this.lowStockItemIds().size,
      outOfStock: this.items().filter((item) => this.itemStockStatus(item) === 'out_of_stock').length,
      avgMargin: activeItems.length ? marginTotal / activeItems.length : 0,
    };
  });

  // Warehouses
  showWarehouseForm = false;
  whForm = inject(FormBuilder).group({
    name:      ['', Validators.required],
    code:      ['', Validators.required],
    gstin:     [''],
    address:   [''],
    isDefault: [false],
    isActive:  [true],
  });
  
  warehouses = signal<any[]>([]);
  isLoadingWarehouses = signal(false);
  selectedWarehouse = signal<any>(null);
  warehouseStock = signal<any[]>([]);
  isLoadingWhStock = signal(false);
  
  createWarehouse() {
    if (this.whForm.invalid) return;
    this.inventoryService.createWarehouse(this.whForm.value as any).subscribe({
      next: () => {
        this.showWarehouseForm = false;
        this.whForm.reset({ isDefault: false, isActive: true });
        this.loadWarehouses();
      }
    });
  }

  // POs
  purchaseOrders = signal<any[]>([]);
  isLoadingPOs = signal(false);
  poStatusFilter = '';

  // Transfers
  transfers = signal<any[]>([]);
  isLoadingTransfers = signal(false);

  // Ledger
  ledgerEntries = signal<any[]>([]);
  isLoadingLedger = signal(false);
  ledgerTypeFilter = '';

  private loadedViews = new Set<string>();

  constructor() {
    effect(() => {
      const view = this.activeView();
      if (this.loadedViews.has(view)) return;
      this.loadedViews.add(view);

      switch (view) {
        case 'items': this.loadItems(); break;
        case 'warehouses': this.loadWarehouses(); break;
        case 'purchase-orders': this.loadPOs(); break;
        case 'transfers': this.loadTransfers(); break;
        case 'ledger': this.loadLedger(); break;
      }
    });
  }

  ngOnInit() {
    this.loadOverview();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['clientId'] || changes['clientId'].firstChange) return;

    this.loadedViews.clear();
    this.loadedViews.add(this.activeView());
    this.loadActiveView();
  }

  refresh() {
    this.loadOverview();
  }

  private get scopedClientId(): string | undefined {
    const value = this.clientId?.trim();
    return value || undefined;
  }

  private loadActiveView() {
    switch (this.activeView()) {
      case 'overview': this.loadOverview(); break;
      case 'items': this.loadItems(); break;
      case 'warehouses': this.loadWarehouses(); break;
      case 'purchase-orders': this.loadPOs(); break;
      case 'transfers': this.loadTransfers(); break;
      case 'ledger': this.loadLedger(); break;
      case 'categories':
      case 'low-stock':
        this.loadOverview();
        break;
    }
  }

  loadOverview() {
    this.isLoading.set(true);
    const clientId = this.scopedClientId;
    this.loadWarehousePerformance();

    this.inventoryService.getLowStockAlerts().subscribe({
      next: (res: any) => {
        const alerts = (res.data ?? []).map((alert: any) => ({
          ...alert,
          itemName: alert.itemName ?? alert.name,
          currentQty: alert.currentQty ?? alert.qtyOnHand,
          reorderLevel: alert.reorderLevel ?? alert.reorderPoint,
          warehouseName: alert.warehouseName ?? 'All warehouses',
          severity: alert.severity === 'low_stock' ? 'low' : alert.severity,
        }));
        this.lowStockAlerts.set(alerts);
        this.lowStockCount.set(alerts.length);
        this.outOfStockCount.set(alerts.filter((a: any) => a.severity === 'out_of_stock').length);
      },
      error: () => {}
    });

    const ledgerRequest = clientId
      ? this.inventoryService.getClientStockLedger(clientId, { limit: 15 })
      : this.inventoryService.getStockLedger({ limit: 15 });
    ledgerRequest.subscribe({
      next: (res: any) => {
        this.recentMovements.set(res.data ?? []);
        this.lastUpdated.set(new Date());
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    const valuationRequest = clientId
      ? this.inventoryService.getClientStockValuation(clientId)
      : this.inventoryService.getStockValuation();
    valuationRequest.subscribe({
      next: (res: any) => {
        const report = res.data;
        const allRows = report?.rows ?? [];
        const rows = [...allRows].sort((a: any, b: any) => Number(b.stockValue ?? 0) - Number(a.stockValue ?? 0)).slice(0, 10);
        const uniqueItemCount = new Set(allRows.map((row: any) => row.itemId).filter(Boolean)).size;
        this.valuationRows.set(rows);
        this.stockValue.set(report?.totalStockValue ?? 0);
        this.totalItems.set(uniqueItemCount || allRows.length);
      },
      error: () => {}
    });

    this.inventoryService.getPurchaseOrders({ clientId, status: 'sent', limit: 1 }).subscribe({
      next: (res: any) => this.pendingPOs.set(res.meta?.total ?? res.total ?? 0),
      error: () => {}
    });
  }

  private loadWarehousePerformance() {
    this.inventoryService.getWarehouses().pipe(
      switchMap((res: any) => {
        const allWarehouses = res?.data ?? res ?? [];
        this.defaultWarehouseCount.set(allWarehouses.filter((warehouse: any) => warehouse.isDefault).length);
        if (allWarehouses.length === 0) {
          return of([]);
        }

        return forkJoin(
          allWarehouses.map((warehouse: any) =>
            this.inventoryService.getWarehouseStock(warehouse.id).pipe(
              map((stockRes: any) => this.toWarehousePerformanceRow(warehouse, stockRes?.data ?? stockRes ?? [])),
              catchError(() => of(this.toWarehousePerformanceRow(warehouse, []))),
            )
          )
        );
      }),
      catchError(() => of([])),
    ).subscribe((rows: any) => {
      this.warehousePerformanceRows.set(
        (rows as WarehousePerformanceRow[])
          .sort((a: WarehousePerformanceRow, b: WarehousePerformanceRow) => Number(b.stockValue ?? 0) - Number(a.stockValue ?? 0))
          .slice(0, 5),
      );
    });
  }

  private toWarehousePerformanceRow(warehouse: any, stockRows: any[]): WarehousePerformanceRow {
    const qtyOnHand = stockRows.reduce((sum, row) => sum + Number(row.qtyOnHand ?? row.qty_on_hand ?? 0), 0);
    const qtyReserved = stockRows.reduce((sum, row) => sum + Number(row.qtyReserved ?? row.qty_reserved ?? 0), 0);
    const stockValue = stockRows.reduce((sum, row) => {
      const qty = Number(row.qtyOnHand ?? row.qty_on_hand ?? 0);
      const cost = Number(row.avgCost ?? row.avg_cost ?? 0);
      return sum + qty * cost;
    }, 0);

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      itemCount: stockRows.length,
      qtyOnHand,
      qtyReserved,
      stockValue,
      reservedPct: qtyOnHand > 0 ? Math.min(100, Math.round((qtyReserved / qtyOnHand) * 100)) : 0,
      isDefault: warehouse.isDefault,
    };
  }

  private formatMoneyShort(value: number): string {
    if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
    if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  private formatShortNumber(value: number): string {
    if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  itemInitials(name: string): string {
    return (name || 'IT')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'IT';
  }

  itemCategoryName(item: any): string {
    return item.category?.name ?? item.categoryName ?? item.category_name ?? 'Uncategorized';
  }

  itemStockRow(item: any): any {
    return this.itemStockIndex().get(item.id) ?? null;
  }

  itemStockAvailable(item: any): number {
    if (!item?.trackInventory) return 0;
    const row = this.itemStockRow(item);
    return Number(row?.qtyAvailable ?? row?.qty_available ?? row?.qtyOnHand ?? row?.qty_on_hand ?? 0);
  }

  itemStockStatus(item: any): 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked' {
    if (!item?.trackInventory) return 'not_tracked';
    const available = this.itemStockAvailable(item);
    if (available <= 0) return 'out_of_stock';
    if (this.lowStockItemIds().has(item.id)) return 'low_stock';
    return 'in_stock';
  }

  stockStatusLabel(item: any): string {
    const labels = {
      in_stock: 'In stock',
      low_stock: 'Low',
      out_of_stock: 'Out',
      not_tracked: 'No track',
    } as const;
    return labels[this.itemStockStatus(item)];
  }

  stockBadgeClass(item: any): string {
    const classes = {
      in_stock: 'bg-emerald-100 text-emerald-700',
      low_stock: 'bg-amber-100 text-amber-700',
      out_of_stock: 'bg-rose-100 text-rose-700',
      not_tracked: 'bg-slate-100 text-slate-500',
    } as const;
    return classes[this.itemStockStatus(item)];
  }

  stockTextClass(item: any): string {
    const classes = {
      in_stock: 'text-emerald-700',
      low_stock: 'text-amber-700',
      out_of_stock: 'text-rose-700',
      not_tracked: 'text-slate-400',
    } as const;
    return classes[this.itemStockStatus(item)];
  }

  itemMarginAmount(item: any): number {
    return Number(item?.sellingPrice ?? 0) - Number(item?.purchasePrice ?? 0);
  }

  itemMarginPct(item: any): number {
    const purchase = Number(item?.purchasePrice ?? 0);
    if (purchase <= 0) return 0;
    return (this.itemMarginAmount(item) / purchase) * 100;
  }

  hasItemFilters(): boolean {
    return Boolean(this.itemSearch || this.itemCategoryFilter() || this.itemStockFilter() || this.itemWarehouseFilter());
  }

  clearItemFilters(): void {
    this.itemSearch = '';
    this.itemCategoryFilter.set('');
    this.itemStockFilter.set('');
    this.itemWarehouseFilter.set('');
    this.loadItems();
  }

  selectCatalogItem(item: any): void {
    this.selectedCatalogItem.set(item);
  }

  openNewItemForm(): void {
    this.selectedCatalogItem.set(null);
    this.editingItemId.set(null);
    this.showItemForm = true;
  }

  editCatalogItem(item: any): void {
    this.selectedCatalogItem.set(null);
    this.editingItemId.set(item?.id ?? null);
    this.showItemForm = true;
  }

  finishItemForm(): void {
    this.showItemForm = false;
    this.editingItemId.set(null);
    this.searchItems();
  }

  cancelItemForm(): void {
    this.showItemForm = false;
    this.editingItemId.set(null);
  }

  openItemLedger(item: any): void {
    this.selectedCatalogItem.set(null);
    this.activeView.set('ledger');
    this.loadLedger(item.id);
  }

  printBarcode(item: any): void {
    const code = item?.barcode || item?.sku || item?.name || 'ITEM';
    window.alert(`Barcode ready: ${code}`);
  }

  reloadItemCatalog(): void {
    this.loadItems();
  }

  loadCatalogValuation(): void {
    this.inventoryService.getStockValuation(this.itemWarehouseFilter() || undefined).subscribe({
      next: (res: any) => {
        const report = res?.data ?? res ?? {};
        this.catalogValuationRows.set(report.rows ?? []);
      },
      error: () => this.catalogValuationRows.set([]),
    });
  }

  // Items
  searchItems() {
    this.isLoadingItems.set(true);
    this.inventoryService.getItems({ search: this.itemSearch, limit: 50 }).subscribe({
      next: (res: any) => { this.items.set(res.data ?? []); this.isLoadingItems.set(false); this.loadCatalogValuation(); },
      error: () => this.isLoadingItems.set(false)
    });
  }

  loadItems() {
    this.isLoadingItems.set(true);
    if (this.warehouses().length === 0) this.loadWarehouses();
    this.inventoryService.getItems({ limit: 50 }).subscribe({
      next: (res: any) => { this.items.set(res.data ?? []); this.isLoadingItems.set(false); this.loadCatalogValuation(); },
      error: () => this.isLoadingItems.set(false)
    });
  }

  // Warehouses
  loadWarehouses() {
    this.isLoadingWarehouses.set(true);
    this.inventoryService.getWarehouses().subscribe({
      next: (res: any) => { this.warehouses.set(res.data ?? []); this.isLoadingWarehouses.set(false); },
      error: () => this.isLoadingWarehouses.set(false)
    });
  }

  selectWarehouse(wh: any) {
    this.selectedWarehouse.set(wh);
    this.isLoadingWhStock.set(true);
    this.inventoryService.getWarehouseStock(wh.id).subscribe({
      next: (res: any) => { this.warehouseStock.set(res.data ?? []); this.isLoadingWhStock.set(false); },
      error: () => this.isLoadingWhStock.set(false)
    });
  }

  // POs
  loadPOs() {
    this.isLoadingPOs.set(true);
    this.inventoryService.getPurchaseOrders({
      clientId: this.scopedClientId,
      status: this.poStatusFilter || undefined,
      limit: 50,
    }).subscribe({
      next: (res: any) => { this.purchaseOrders.set(res.data ?? []); this.isLoadingPOs.set(false); },
      error: () => this.isLoadingPOs.set(false)
    });
  }

  // Transfers
  loadTransfers() {
    this.isLoadingTransfers.set(true);
    const clientId = this.scopedClientId;
    const request = clientId
      ? this.inventoryService.getStockTransfersForClient(clientId, { limit: 50 })
      : this.inventoryService.getTransfers({ limit: 50 });

    request.subscribe({
      next: (res: any) => { this.transfers.set(res.data ?? []); this.isLoadingTransfers.set(false); },
      error: () => this.isLoadingTransfers.set(false)
    });
  }

  // Ledger
  loadLedger(itemId?: string) {
    this.isLoadingLedger.set(true);
    const clientId = this.scopedClientId;
    const filters = { itemId: itemId || undefined, transactionType: this.ledgerTypeFilter || undefined, limit: 100 };
    const request = clientId
      ? this.inventoryService.getClientStockLedger(clientId, filters)
      : this.inventoryService.getStockLedger(filters);

    request.subscribe({
      next: (res: any) => { this.ledgerEntries.set(res.data ?? []); this.isLoadingLedger.set(false); },
      error: () => this.isLoadingLedger.set(false)
    });
  }
}
