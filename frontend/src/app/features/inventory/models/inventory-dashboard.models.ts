import type { LowStockAlert, StockLedgerEntry, StockValuationRow } from './inventory.models';

export type InventoryDashboardTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

export interface InventoryKpi {
  label: string;
  value: string;
  icon: string;
  tone: InventoryDashboardTone;
  sub?: string;
}

export interface QuickAction {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: InventoryDashboardTone;
}

export interface WarehousePerformanceRow {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  qtyOnHand: number;
  qtyReserved: number;
  stockValue: number;
  reservedPct: number;
  isDefault: boolean;
}

export interface SystemWarning {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  icon: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface InventoryDashboardData {
  lowStockAlerts: LowStockAlert[];
  recentMovements: StockLedgerEntry[];
  valuationRows: StockValuationRow[];
  totalStockValue: number;
  pendingPurchaseOrders: number;
  warehouseRows: WarehousePerformanceRow[];
  defaultWarehouseCount: number;
}
