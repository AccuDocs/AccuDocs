import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { InventoryService } from '@core/services/inventory.service';
import type { LowStockAlert, StockLedgerEntry, StockValuationRow, Warehouse } from '../../../models/inventory.models';
import type { InventoryKpi, QuickAction, SystemWarning, WarehousePerformanceRow } from '../../../models/inventory-dashboard.models';
import { DashboardToolbarComponent } from '../../../components/header/dashboard-toolbar/dashboard-toolbar.component';
import { InventoryKpiCardsComponent } from '../../../components/kpis/inventory-kpi-cards/inventory-kpi-cards.component';
import { LowStockAlertWidgetComponent } from '../../../components/inventory/low-stock-alert-widget/low-stock-alert-widget.component';
import { WarehousePerformanceWidgetComponent } from '../../../components/inventory/warehouse-performance-widget/warehouse-performance-widget.component';
import { RecentStockActivityWidgetComponent } from '../../../components/inventory/recent-stock-activity-widget/recent-stock-activity-widget.component';
import { SystemWarningWidgetComponent } from '../../../components/monitoring/system-warning-widget/system-warning-widget.component';
import { QuickActionsWidgetComponent } from '../../../components/actions/quick-actions-widget/quick-actions-widget.component';

@Component({
  selector: 'app-inventory-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardToolbarComponent,
    InventoryKpiCardsComponent,
    LowStockAlertWidgetComponent,
    WarehousePerformanceWidgetComponent,
    RecentStockActivityWidgetComponent,
    SystemWarningWidgetComponent,
    QuickActionsWidgetComponent,
  ],
  template: `
    <main class="min-h-screen overflow-x-hidden bg-[#f6f8fb] p-4 sm:p-6">
      <div class="mx-auto min-w-0 max-w-[1680px] space-y-5">
        <app-dashboard-toolbar
          [loading]="loading()"
          [lastUpdated]="lastUpdated()"
          (refresh)="loadDashboard()">
        </app-dashboard-toolbar>

        <app-inventory-kpi-cards [cards]="kpiCards()" [loading]="loading()"></app-inventory-kpi-cards>

        <app-quick-actions-widget [actions]="quickActions"></app-quick-actions-widget>

        <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
          <app-low-stock-alert-widget [alerts]="lowStockAlerts()" [loading]="loading()"></app-low-stock-alert-widget>
          <app-warehouse-performance-widget [warehouses]="warehouseRows()" [loading]="loading()"></app-warehouse-performance-widget>
          <app-system-warning-widget [warnings]="systemWarnings()" [loading]="loading()"></app-system-warning-widget>
        </div>

        <app-recent-stock-activity-widget
          [movements]="recentMovements()"
          [loading]="loading()">
        </app-recent-stock-activity-widget>
      </div>
    </main>
  `,
})
export class InventoryDashboardPageComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);

  readonly loading = signal(true);
  readonly lastUpdated = signal<Date | null>(null);
  readonly lowStockAlerts = signal<LowStockAlert[]>([]);
  readonly recentMovements = signal<StockLedgerEntry[]>([]);
  readonly valuationRows = signal<StockValuationRow[]>([]);
  readonly totalStockValue = signal(0);
  readonly pendingPurchaseOrders = signal(0);
  readonly warehouseRows = signal<WarehousePerformanceRow[]>([]);
  readonly defaultWarehouseCount = signal(0);

  readonly quickActions: QuickAction[] = [
    {
      label: 'Add inventory item',
      description: 'Create SKU, barcode, GST, pricing, and stock rules.',
      icon: 'add_box',
      route: '/inventory/items/new',
      tone: 'blue',
    },
    {
      label: 'Create purchase order',
      description: 'Raise supplier PO for new or low-stock items.',
      icon: 'receipt_long',
      route: '/inventory/purchase-orders/new',
      tone: 'green',
    },
    {
      label: 'Transfer stock',
      description: 'Move stock between store, warehouse, and service counters.',
      icon: 'swap_horiz',
      route: '/inventory/transfers/new',
      tone: 'slate',
    },
    {
      label: 'Scan barcode',
      description: 'Lookup products by barcode or internal SKU.',
      icon: 'qr_code_scanner',
      route: '/inventory/scanner',
      tone: 'amber',
    },
  ];

  readonly kpiCards = computed<InventoryKpi[]>(() => {
    const alerts = this.lowStockAlerts();
    const outOfStock = alerts.filter((alert: any) => alert.severity === 'out_of_stock').length;
    const totalQty = this.warehouseRows().reduce((sum, row) => sum + row.qtyOnHand, 0);

    return [
      {
        label: 'Total SKUs',
        value: String(this.valuationRows().length),
        icon: 'inventory_2',
        tone: 'blue',
        sub: `${this.formatNumber(totalQty)} units on hand`,
      },
      {
        label: 'Stock Value',
        value: `INR ${this.formatCurrencyShort(this.totalStockValue())}`,
        icon: 'payments',
        tone: 'green',
        sub: 'Weighted average valuation',
      },
      {
        label: 'Low Stock',
        value: String(alerts.length),
        icon: outOfStock > 0 ? 'error' : 'warning',
        tone: outOfStock > 0 ? 'red' : alerts.length > 0 ? 'amber' : 'green',
        sub: outOfStock > 0 ? `${outOfStock} out of stock` : 'Reorder watchlist',
      },
      {
        label: 'Pending POs',
        value: String(this.pendingPurchaseOrders()),
        icon: 'local_shipping',
        tone: this.pendingPurchaseOrders() > 0 ? 'amber' : 'slate',
        sub: 'Sent and awaiting receipt',
      },
    ];
  });

  readonly systemWarnings = computed<SystemWarning[]>(() => {
    const warnings: SystemWarning[] = [];
    const alerts = this.lowStockAlerts();
    const outOfStock = alerts.filter((alert: any) => alert.severity === 'out_of_stock').length;

    if (outOfStock > 0) {
      warnings.push({
        title: 'Out-of-stock items detected',
        message: `${outOfStock} item(s) cannot be sold without replenishment or negative-stock override.`,
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

    if (this.warehouseRows().length === 0) {
      warnings.push({
        title: 'No warehouse stock summary',
        message: 'Create a warehouse and record opening stock to activate dashboard analytics.',
        severity: 'info',
        icon: 'inventory',
        actionLabel: 'Open warehouses',
        actionRoute: '/inventory/warehouses',
      });
    }

    return warnings;
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);

    forkJoin({
      lowStock: this.inventoryService.getLowStockAlerts().pipe(catchError(() => of({ data: [] }))),
      ledger: this.inventoryService.getStockLedger({ limit: 12 }).pipe(catchError(() => of({ data: [] }))),
      valuation: this.inventoryService.getStockValuation().pipe(catchError(() => of({ data: { rows: [], totalStockValue: 0 } }))),
      purchaseOrders: this.inventoryService.getPurchaseOrders({ status: 'sent', limit: 1 }).pipe(catchError(() => of({ meta: { total: 0 }, total: 0 }))),
      warehouses: this.loadWarehousePerformance(),
    }).subscribe({
      next: ({ lowStock, ledger, valuation, purchaseOrders, warehouses }) => {
        const valuationData = valuation?.data ?? { rows: [], totalStockValue: 0 };

        this.lowStockAlerts.set(lowStock?.data ?? []);
        this.recentMovements.set(ledger?.data ?? []);
        this.valuationRows.set(valuationData.rows ?? []);
        this.totalStockValue.set(Number(valuationData.totalStockValue ?? 0));
        this.pendingPurchaseOrders.set(Number(purchaseOrders?.meta?.total ?? purchaseOrders?.total ?? 0));
        this.warehouseRows.set(warehouses.rows);
        this.defaultWarehouseCount.set(warehouses.defaultWarehouseCount);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadWarehousePerformance() {
    return this.inventoryService.getWarehouses().pipe(
      switchMap((response: any) => {
        const warehouses: Warehouse[] = response?.data ?? response ?? [];
        if (warehouses.length === 0) {
          return of({ rows: [], defaultWarehouseCount: 0 });
        }

        return forkJoin(
          warehouses.map((warehouse) =>
            this.inventoryService.getWarehouseStock(warehouse.id).pipe(
              map((stockResponse: any) => this.toWarehousePerformanceRow(warehouse, stockResponse?.data ?? stockResponse ?? [])),
              catchError(() => of(this.toWarehousePerformanceRow(warehouse, []))),
            )
          )
        ).pipe(
          map((rows) => ({
            rows: rows.sort((a, b) => b.stockValue - a.stockValue).slice(0, 5),
            defaultWarehouseCount: warehouses.filter((warehouse) => warehouse.isDefault).length,
          })),
        );
      }),
      catchError(() => of({ rows: [], defaultWarehouseCount: 0 })),
    );
  }

  private toWarehousePerformanceRow(warehouse: Warehouse, stockRows: any[]): WarehousePerformanceRow {
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

  private formatCurrencyShort(value: number): string {
    if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
    if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  private formatNumber(value: number): string {
    if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }
}
