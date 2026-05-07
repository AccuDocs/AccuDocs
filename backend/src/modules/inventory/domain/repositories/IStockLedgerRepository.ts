import { StockMovement } from '../entities/StockMovement.entity';
import type { Transaction } from 'sequelize';

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
  append(movement: StockMovement, options?: { transaction?: Transaction }): Promise<StockMovement>;
  findAll(filters: StockLedgerFilters): Promise<{ rows: StockMovement[]; total: number }>;
  getCurrentBalance(
    warehouseId: string,
    itemId: string,
    variantId?: string | null,
    batchNo?: string | null,
    options?: { transaction?: Transaction; lock?: boolean },
  ): Promise<number>;
  getClientMovements(clientId: string, orgId: string): Promise<StockMovement[]>;
  updateStockSummary(
    warehouseId: string,
    itemId: string,
    variantId: string | null,
    batchNo: string | null,
    qtyIn: number,
    qtyOut: number,
    rate: number,
    options?: { transaction?: Transaction; allowNegativeStock?: boolean },
  ): Promise<void>;
}
