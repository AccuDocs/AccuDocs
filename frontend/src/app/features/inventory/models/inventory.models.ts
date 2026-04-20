// ─── Core Enums ───────────────────────────────────────────────────────────────

export type ItemType = 'goods' | 'service';
export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';
export type TransactionType =
  | 'purchase' | 'sale' | 'transfer_in' | 'transfer_out'
  | 'adjustment' | 'opening_stock' | 'return' | 'damage' | 'production';
export type ValuationMethod = 'FIFO' | 'weighted_avg';

// ─── Warehouse ─────────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  orgId: string;
  branchId?: string | null;
  name: string;
  code: string;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Item Category ─────────────────────────────────────────────────────────────

export interface ItemCategory {
  id: string;
  orgId: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  isActive: boolean;
  children?: ItemCategory[];
}

// ─── Item Variant ──────────────────────────────────────────────────────────────

export interface ItemVariant {
  id: string;
  itemId: string;
  variantName: string;
  skuSuffix?: string | null;
  barcode?: string | null;
  additionalPrice: number;
  attributes: Record<string, any>;
  isActive: boolean;
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  organizationId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hsnSacCode?: string | null;
  itemType: ItemType;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  gstRate: number;
  cessRate: number;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  categoryId?: string | null;
  category?: ItemCategory | null;
  isActive: boolean;
  description?: string | null;
  variants?: ItemVariant[];
  createdAt: string;
  updatedAt: string;
}

// ─── Client Item Pricing ───────────────────────────────────────────────────────

export interface ClientItemPricing {
  id: string;
  clientId: string;
  itemId: string;
  variantId?: string | null;
  customSellingPrice: number;
  discountPct: number;
  validFrom?: string | null;
  validTo?: string | null;
  item?: Partial<Item>;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Ledger Entry ────────────────────────────────────────────────────────

export interface StockLedgerEntry {
  id: string;
  orgId: string;
  warehouseId: string;
  warehouse?: Partial<Warehouse>;
  itemId: string;
  item?: Partial<Item>;
  variantId?: string | null;
  variant?: Partial<ItemVariant> | null;
  transactionType: TransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  batchNo?: string | null;
  serialNo?: string | null;
  qtyIn: number;
  qtyOut: number;
  rate: number;
  valuationMethod: ValuationMethod;
  runningBalance: number;
  transactionDate: string;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
}

// ─── Stock Summary ─────────────────────────────────────────────────────────────

export interface StockSummary {
  id: string;
  warehouseId: string;
  warehouse?: Partial<Warehouse>;
  itemId: string;
  item?: Partial<Item>;
  variantId?: string | null;
  variant?: Partial<ItemVariant> | null;
  batchNo?: string | null;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  avgCost: number;
  lastPurchaseRate: number;
  lastUpdated: string;
}

// ─── Purchase Order Line Item ──────────────────────────────────────────────────

export interface POLineItem {
  id: string;
  poId: string;
  itemId: string;
  item?: Partial<Item>;
  variantId?: string | null;
  hsnSacCode?: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  batchNo?: string | null;
  expectedDate?: string | null;
}

// ─── Purchase Order ────────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  orgId: string;
  branchId?: string | null;
  supplierClientId: string;
  supplier?: { id: string; name: string; gstin?: string; mobile?: string };
  poNumber: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  warehouseId: string;
  warehouse?: Partial<Warehouse>;
  status: POStatus;
  subtotal: number;
  gstAmount: number;
  total: number;
  notes?: string | null;
  createdBy: string;
  items?: POLineItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Transfer Item ───────────────────────────────────────────────────────

export interface TransferLineItem {
  id: string;
  transferId: string;
  itemId: string;
  item?: Partial<Item>;
  variantId?: string | null;
  batchNo?: string | null;
  serialNo?: string | null;
  qtyTransferred: number;
  qtyReceived: number;
  unitCost: number;
}

// ─── Stock Transfer ────────────────────────────────────────────────────────────

export interface StockTransfer {
  id: string;
  orgId: string;
  transferNo: string;
  transferDate: string;
  fromWarehouseId: string;
  fromWarehouse?: Partial<Warehouse>;
  toWarehouseId: string;
  toWarehouse?: Partial<Warehouse>;
  status: TransferStatus;
  notes?: string | null;
  createdBy: string;
  transferItems?: TransferLineItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard / Report DTOs ───────────────────────────────────────────────────

export interface StockValuationRow {
  itemId: string;
  itemName: string;
  sku?: string | null;
  uom: string;
  qtyOnHand: number;
  avgCost: number;
  stockValue: number;
  sellingPrice: number;
  marketValue: number;
}

export interface StockValuationReport {
  rows: StockValuationRow[];
  totalStockValue: number;
}

export interface LowStockAlert {
  itemId: string;
  name: string;
  sku?: string | null;
  qtyOnHand: number;
  reorderPoint: number;
  reorderQty?: number | null;
  severity: 'low_stock' | 'out_of_stock';
}

export interface ClientStockSummary {
  totalPurchases: number;
  totalSales: number;
  purchasedQty: number;
  soldQty: number;
  purchaseValue: number;
  saleValue: number;
  movements: Array<{
    id: string;
    transactionType: TransactionType;
    transactionDate: string;
    itemId: string;
    qtyIn: number;
    qtyOut: number;
    rate: number;
    value: number;
    notes?: string | null;
  }>;
}

// ─── Form DTOs ─────────────────────────────────────────────────────────────────

export interface CreateItemDto {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hsnSacCode?: string | null;
  itemType: ItemType;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  gstRate: number;
  cessRate: number;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  categoryId?: string | null;
  isActive: boolean;
  description?: string | null;
}

export interface CreateWarehouseDto {
  name: string;
  code: string;
  branchId?: string | null;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export interface CreatePODto {
  supplierClientId: string;
  warehouseId: string;
  branchId?: string | null;
  poDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  lineItems: Array<{
    itemId: string;
    variantId?: string | null;
    hsnSacCode?: string | null;
    qtyOrdered: number;
    unitPrice: number;
    gstRate?: number;
    batchNo?: string | null;
  }>;
}

export interface ReceivePODto {
  receivedItems: Array<{
    poItemId: string;
    qtyReceived: number;
    batchNo?: string;
  }>;
}

export interface CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate?: string;
  notes?: string | null;
  items: Array<{
    itemId: string;
    variantId?: string | null;
    qty: number;
    unitCost?: number;
    batchNo?: string | null;
    serialNo?: string | null;
  }>;
}

export interface SetClientPriceDto {
  clientId: string;
  itemId: string;
  variantId?: string | null;
  customSellingPrice: number;
  discountPct?: number;
  validFrom?: string | null;
  validTo?: string | null;
}

// ─── Paginated Response ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
