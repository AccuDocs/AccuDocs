import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import type {
  Item, Warehouse, StockLedgerEntry, StockSummary,
  PurchaseOrder, StockTransfer, ClientItemPricing,
  StockValuationReport, LowStockAlert, ClientStockSummary,
  CreateItemDto, CreateWarehouseDto, CreatePODto, ReceivePODto,
  CreateTransferDto, SetClientPriceDto, ItemVariant,
} from '@app/features/inventory/models/inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory`;

  // ─── Items ──────────────────────────────────────────────────────────────────

  getItems(filters: {
    search?: string;
    itemType?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.search)     params = params.set('search',     filters.search);
    if (filters.itemType)   params = params.set('itemType',   filters.itemType);
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    params = params.set('page',  String(filters.page  ?? 1));
    params = params.set('limit', String(filters.limit ?? 50));
    return this.http.get(`${this.base}/items`, { params });
  }

  getItemById(id: string): Observable<any> {
    return this.http.get(`${this.base}/items/${id}`);
  }

  getItemByBarcode(barcode: string): Observable<any> {
    return this.http.get(`${this.base}/items/barcode/${barcode}`);
  }

  createItem(dto: CreateItemDto): Observable<any> {
    return this.http.post(`${this.base}/items`, dto);
  }

  updateItem(id: string, dto: Partial<CreateItemDto>): Observable<any> {
    return this.http.put(`${this.base}/items/${id}`, dto);
  }

  deleteItem(id: string): Observable<any> {
    return this.http.delete(`${this.base}/items/${id}`);
  }

  // ─── Variants ───────────────────────────────────────────────────────────────

  getVariants(itemId: string): Observable<any> {
    return this.http.get(`${this.base}/items/${itemId}/variants`);
  }

  addVariant(itemId: string, dto: Partial<ItemVariant>): Observable<any> {
    return this.http.post(`${this.base}/items/${itemId}/variants`, dto);
  }

  updateVariant(itemId: string, variantId: string, dto: Partial<ItemVariant>): Observable<any> {
    return this.http.put(`${this.base}/items/${itemId}/variants/${variantId}`, dto);
  }

  // ─── Client Pricing ─────────────────────────────────────────────────────────

  getEffectivePrice(itemId: string, clientId: string): Observable<any> {
    return this.http.get(`${this.base}/items/${itemId}/client-price/${clientId}`);
  }

  setClientItemPrice(dto: SetClientPriceDto): Observable<any> {
    return this.http.post(`${this.base}/items/client-pricing`, dto);
  }

  getClientPricing(clientId: string): Observable<any> {
    return this.http.get(`${this.base}/client-pricing/${clientId}`);
  }

  // ─── Warehouses ─────────────────────────────────────────────────────────────

  getWarehouses(): Observable<any> {
    return this.http.get(`${this.base}/warehouses`);
  }

  getWarehouseById(id: string): Observable<any> {
    return this.http.get(`${this.base}/warehouses/${id}`);
  }

  createWarehouse(dto: CreateWarehouseDto): Observable<any> {
    return this.http.post(`${this.base}/warehouses`, dto);
  }

  updateWarehouse(id: string, dto: Partial<CreateWarehouseDto>): Observable<any> {
    return this.http.put(`${this.base}/warehouses/${id}`, dto);
  }

  deleteWarehouse(id: string): Observable<any> {
    return this.http.delete(`${this.base}/warehouses/${id}`);
  }

  getWarehouseStock(warehouseId: string): Observable<any> {
    return this.http.get(`${this.base}/warehouses/${warehouseId}/stock-summary`);
  }

  // ─── Stock Ledger ────────────────────────────────────────────────────────────

  getStockLedger(filters: {
    warehouseId?: string;
    itemId?: string;
    clientId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/stock/ledger`, { params });
  }

  setOpeningStock(dto: {
    warehouseId: string; itemId: string; qty: number; rate: number;
    variantId?: string; batchNo?: string; notes?: string; transactionDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/stock/opening`, dto);
  }

  adjustStock(dto: {
    warehouseId: string; itemId: string; adjustedQty: number; rate?: number;
    variantId?: string; reason?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/stock/adjust`, dto);
  }

  getStockValuation(warehouseId?: string): Observable<any> {
    const params = warehouseId ? new HttpParams().set('warehouseId', warehouseId) : new HttpParams();
    return this.http.get(`${this.base}/stock/valuation`, { params });
  }

  getLowStockAlerts(): Observable<any> {
    return this.http.get(`${this.base}/stock/low-stock-alerts`);
  }

  // ─── Client Workspace ─────────────────────────────────────────────────────────

  getClientStockSummary(clientId: string): Observable<any> {
    return this.http.get(`${this.base}/stock/client-summary/${clientId}`);
  }

  getClientStockHistory(clientId: string): Observable<any> {
    return this.http.get(`${this.base}/stock/client-history/${clientId}`);
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────────

  getPurchaseOrders(filters: {
    status?: string; clientId?: string; page?: number; limit?: number;
  } = {}): Observable<any> {
    let params = new HttpParams();
    if (filters.status)   params = params.set('status',   filters.status);
    if (filters.clientId) params = params.set('clientId', filters.clientId);
    params = params.set('page',  String(filters.page  ?? 1));
    params = params.set('limit', String(filters.limit ?? 20));
    return this.http.get(`${this.base}/purchase-orders`, { params });
  }

  getPurchaseOrderById(id: string): Observable<any> {
    return this.http.get(`${this.base}/purchase-orders/${id}`);
  }

  createPurchaseOrder(dto: CreatePODto): Observable<any> {
    return this.http.post(`${this.base}/purchase-orders`, dto);
  }

  sendPurchaseOrder(id: string): Observable<any> {
    return this.http.patch(`${this.base}/purchase-orders/${id}/send`, {});
  }

  cancelPurchaseOrder(id: string): Observable<any> {
    return this.http.patch(`${this.base}/purchase-orders/${id}/cancel`, {});
  }

  receivePurchaseOrder(id: string, dto: ReceivePODto): Observable<any> {
    return this.http.post(`${this.base}/purchase-orders/${id}/receive`, dto);
  }

  getPurchaseOrdersByClient(clientId: string): Observable<any> {
    return this.http.get(`${this.base}/purchase-orders/client/${clientId}`);
  }

  // ─── Stock Transfers ─────────────────────────────────────────────────────────

  getTransfers(filters: { status?: string; page?: number; limit?: number } = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/transfers`, { params });
  }

  getTransferById(id: string): Observable<any> {
    return this.http.get(`${this.base}/transfers/${id}`);
  }

  createTransfer(dto: CreateTransferDto): Observable<any> {
    return this.http.post(`${this.base}/transfers`, dto);
  }

  dispatchTransfer(id: string): Observable<any> {
    return this.http.patch(`${this.base}/transfers/${id}/dispatch`, {});
  }

  receiveTransfer(id: string, receivedQtys?: Record<string, number>): Observable<any> {
    return this.http.patch(`${this.base}/transfers/${id}/receive`, { receivedQtys });
  }

  // ─── Additional Methods for Complete Feature Set ──────────────────────────────

  recordStockAdjustment(dto: {
    warehouseId: string;
    itemId: string;
    variantId?: string;
    adjustedQty: number;
    reason?: string;
    notes?: string;
    clientId?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/stock/adjustment`, dto);
  }

  autoCreatePOsForLowStock(clientId: string): Observable<any> {
    return this.http.post(`${this.base}/purchase-orders/auto-create/${clientId}`, {});
  }

  downloadPOPdf(poId: string): Observable<Blob> {
    return this.http.get(`${this.base}/purchase-orders/${poId}/pdf`, { responseType: 'blob' });
  }

  sendPurchaseOrderViaWhatsApp(poId: string): Observable<any> {
    return this.http.post(`${this.base}/purchase-orders/${poId}/send-whatsapp`, {});
  }

  getClientStockLedger(clientId: string, filters: {
    warehouseId?: string;
    itemId?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/stock/client-ledger/${clientId}`, { params });
  }

  getClientStockValuation(clientId: string, filters: {
    warehouseId?: string;
    method?: 'FIFO' | 'weighted_avg';
  } = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/stock/client-valuation/${clientId}`, { params });
  }

  getStockTransfersForClient(clientId: string, filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/transfers/client/${clientId}`, { params });
  }

  createStockTransferForClient(clientId: string, dto: CreateTransferDto): Observable<any> {
    return this.http.post(`${this.base}/transfers/client/${clientId}`, dto);
  }

  updateClientPrice(id: string, dto: Partial<SetClientPriceDto>): Observable<any> {
    return this.http.put(`${this.base}/client-pricing/${id}`, dto);
  }

  deleteClientPrice(id: string): Observable<any> {
    return this.http.delete(`${this.base}/client-pricing/${id}`);
  }

  getLowStockAlertsForClient(clientId: string): Observable<any> {
    return this.http.get(`${this.base}/stock/low-stock-alerts/client/${clientId}`);
  }

  // ─── Standalone Inventory Methods ──────────────────────────────────────────

  getInventoryDashboardMetrics(): Observable<any> {
    return this.http.get(`${this.base}/dashboard/metrics`);
  }

  getInventoryDashboardCharts(): Observable<any> {
    return this.http.get(`${this.base}/dashboard/charts`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${this.base}/categories`);
  }

  getItemsWithLowStock(): Observable<any> {
    return this.http.get(`${this.base}/items/low-stock`);
  }

  searchItems(query: string): Observable<any> {
    return this.http.get(`${this.base}/items/search`, {
      params: new HttpParams().set('q', query)
    });
  }
}
