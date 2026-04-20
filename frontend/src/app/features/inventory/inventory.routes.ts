import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./inventory-dashboard/inventory-dashboard.component').then(m => m.InventoryDashboardComponent),
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./items/item-list/item-list.component').then(m => m.ItemListComponent),
  },
  {
    path: 'items/new',
    loadComponent: () =>
      import('./items/item-form/item-form.component').then(m => m.ItemFormComponent),
  },
  {
    path: 'items/:id/edit',
    loadComponent: () =>
      import('./items/item-form/item-form.component').then(m => m.ItemFormComponent),
  },
  {
    path: 'warehouses',
    loadComponent: () =>
      import('./warehouses/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent),
  },
  {
    path: 'warehouses/:id/stock',
    loadComponent: () =>
      import('./warehouses/warehouse-stock-view/warehouse-stock-view.component').then(m => m.WarehouseStockViewComponent),
  },
  {
    path: 'purchase-orders',
    loadComponent: () =>
      import('./purchase-orders/po-list/po-list.component').then(m => m.PoListComponent),
  },
  {
    path: 'purchase-orders/new',
    loadComponent: () =>
      import('./purchase-orders/po-form/po-form.component').then(m => m.PoFormComponent),
  },
  {
    path: 'purchase-orders/:id/receive',
    loadComponent: () =>
      import('./purchase-orders/po-receive/po-receive.component').then(m => m.PoReceiveComponent),
  },
  {
    path: 'transfers',
    loadComponent: () =>
      import('./stock-transfers/transfer-list/transfer-list.component').then(m => m.TransferListComponent),
  },
  {
    path: 'transfers/new',
    loadComponent: () =>
      import('./stock-transfers/transfer-form/transfer-form.component').then(m => m.TransferFormComponent),
  },
  {
    path: 'ledger',
    loadComponent: () =>
      import('./stock-ledger/stock-ledger.component').then(m => m.StockLedgerComponent),
  },
  {
    path: 'low-stock',
    loadComponent: () =>
      import('./low-stock-alerts/low-stock-alerts.component').then(m => m.LowStockAlertsComponent),
  },
  {
    path: 'scanner',
    loadComponent: () =>
      import('./barcode-scanner/barcode-scanner.component').then(m => m.BarcodeScannerComponent),
  },
];
