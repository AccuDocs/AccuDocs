import { StockMovement } from '../entities/StockMovement.entity';

export interface StockLedgerFilters {
  orgId: string;
  warehouseId?: string;
  itemId?: string;
  clientId?: string;
  transactionType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface IStockLedgerRepository {
  append(movement: StockMovement): Promise<StockMovement>;
  findAll(filters: StockLedgerFilters): Promise<{ rows: StockMovement[]; total: number }>;
  getCurrentBalance(warehouseId: string, itemId: string, variantId?: string | null): Promise<number>;
  getClientMovements(clientId: string, orgId: string): Promise<StockMovement[]>;
  updateStockSummary(
    warehouseId: string,
    itemId: string,
    variantId: string | null,
    batchNo: string | null,
    qtyIn: number,
    qtyOut: number,
    rate: number,
  ): Promise<void>;
}
