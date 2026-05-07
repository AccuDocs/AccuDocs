import { injectable, inject } from 'tsyringe';
import type { Transaction } from 'sequelize';
import { IStockLedgerRepository } from '../../domain/repositories/IStockLedgerRepository';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { StockMovement, TransactionType, ValuationMethod } from '../../domain/entities/StockMovement.entity';
import { StockValuationService } from '../../domain/services/StockValuationService';
import { AppError } from '../../../../utils/errors';
import { sequelize } from '../../../../config/database.config';
import {
  Item as ItemModel,
  StockSummary as StockSummaryModel,
} from '../../../../models';

export interface StockMovementDTO {
  orgId: string;
  warehouseId: string;
  itemId: string;
  variantId?: string | null;
  transactionType: TransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  clientId?: string | null;
  batchNo?: string | null;
  serialNo?: string | null;
  qtyIn?: number;
  qtyOut?: number;
  rate?: number;
  valuationMethod?: ValuationMethod;
  transactionDate?: Date | string;
  notes?: string | null;
  createdBy: string;
}

interface StockMovementOptions {
  transaction?: Transaction;
}

@injectable()
export class StockService {
  constructor(
    @inject('IStockLedgerRepository') private stockRepo: IStockLedgerRepository,
    @inject('IWarehouseRepository') private warehouseRepo: IWarehouseRepository,
  ) {}

  // ─── Core: Record Movement ────────────────────────────────────────────────────

  async recordMovement(dto: StockMovementDTO, options: StockMovementOptions = {}): Promise<StockMovement> {
    if (!options.transaction) {
      return sequelize.transaction((transaction) => this.recordMovement(dto, { transaction }));
    }
    const transaction = options.transaction;

    const qtyIn  = Number(dto.qtyIn  ?? 0);
    const qtyOut = Number(dto.qtyOut ?? 0);
    const rate   = Number(dto.rate   ?? 0);

    // Fetch item to check allow_negative_stock flag
    const item = await ItemModel.findOne({ where: { id: dto.itemId, orgId: dto.orgId }, transaction });
    if (!item) throw new AppError('Item not found', 404);
    await this.lockStockKey(transaction, dto);

    if (!item.trackInventory && dto.transactionType !== 'adjustment') {
      // Services don't track inventory — still write ledger entry but skip stock check
    } else if (qtyOut > 0) {
      const currentBalance = await this.stockRepo.getCurrentBalance(
        dto.warehouseId,
        dto.itemId,
        dto.variantId,
        dto.batchNo,
        { transaction, lock: true },
      );
      const check = StockValuationService.checkNegativeStock(
        currentBalance,
        qtyOut,
        item.allowNegativeStock,
      );
      if (!check.allowed) throw new AppError(check.message!, 422);
    }

    // Compute running balance
    const currentBalance = await this.stockRepo.getCurrentBalance(
      dto.warehouseId,
      dto.itemId,
      dto.variantId,
      dto.batchNo,
      { transaction, lock: true },
    );
    const runningBalance = currentBalance + qtyIn - qtyOut;

    const movementResult = StockMovement.create({
      orgId: dto.orgId,
      warehouseId: dto.warehouseId,
      itemId: dto.itemId,
      variantId: dto.variantId ?? null,
      transactionType: dto.transactionType,
      referenceType: (dto.referenceType as any) ?? null,
      referenceId: dto.referenceId ?? null,
      clientId: dto.clientId ?? null,
      batchNo: dto.batchNo ?? null,
      serialNo: dto.serialNo ?? null,
      qtyIn,
      qtyOut,
      rate,
      valuationMethod: dto.valuationMethod ?? 'weighted_avg',
      runningBalance,
      transactionDate: dto.transactionDate ? new Date(dto.transactionDate as string) : new Date(),
      notes: dto.notes ?? null,
      createdBy: dto.createdBy,
    });
    if (movementResult.isFailure) throw new AppError(movementResult.getError() as string, 400);

    const saved = await this.stockRepo.append(movementResult.getValue(), { transaction });

    // Update stock_summary synchronously
    await this.stockRepo.updateStockSummary(
      dto.warehouseId,
      dto.itemId,
      dto.variantId ?? null,
      dto.batchNo ?? null,
      qtyIn,
      qtyOut,
      rate,
      { transaction, allowNegativeStock: item.allowNegativeStock },
    );

    return saved;
  }

  // ─── Opening Stock ────────────────────────────────────────────────────────────

  async setOpeningStock(dto: StockMovementDTO & { qty: number }) {
    return this.recordMovement({
      ...dto,
      transactionType: 'opening_stock',
      qtyIn: dto.qty,
      qtyOut: 0,
      referenceType: 'manual',
    });
  }

  // ─── Manual Adjustment ────────────────────────────────────────────────────────

  async adjustStock(dto: StockMovementDTO & { adjustedQty: number; reason?: string }) {
    return sequelize.transaction(async (transaction) => {
      await this.lockStockKey(transaction, dto);
      const current = await this.stockRepo.getCurrentBalance(
        dto.warehouseId,
        dto.itemId,
        dto.variantId,
        dto.batchNo,
        { transaction, lock: true },
      );
      const diff = dto.adjustedQty - current;
      return this.recordMovement({
        ...dto,
        transactionType: 'adjustment',
        qtyIn:  diff > 0 ? diff : 0,
        qtyOut: diff < 0 ? Math.abs(diff) : 0,
        referenceType: 'manual',
        notes: dto.reason ?? dto.notes,
      }, { transaction });
    });
  }

  // ─── Ledger ───────────────────────────────────────────────────────────────────

  async getLedger(orgId: string, filters: any, pagination: any) {
    return this.stockRepo.findAll({
      orgId,
      warehouseId: filters.warehouseId,
      itemId: filters.itemId,
      clientId: filters.clientId,
      transactionType: filters.transactionType,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate:   filters.endDate   ? new Date(filters.endDate)   : undefined,
      page:  Number(pagination.page  ?? 1),
      limit: Number(pagination.limit ?? 20),
    });
  }

  async getClientStockLedger(orgId: string, clientId: string, filters: any, pagination: any) {
    return this.getLedger(
      orgId,
      {
        ...filters,
        clientId,
        startDate: filters.startDate ?? filters.dateFrom,
        endDate: filters.endDate ?? filters.dateTo,
      },
      pagination,
    );
  }

  // ─── Valuation Report ─────────────────────────────────────────────────────────

  async getStockValuation(orgId: string, warehouseId?: string) {
    const where: any = { '$item.org_id$': orgId };
    if (warehouseId) where.warehouseId = warehouseId;

    const summaries = await StockSummaryModel.findAll({
      where,
      include: [
        {
          model: ItemModel,
          as: 'item',
          attributes: ['id', 'name', 'sku', 'unitOfMeasure', 'sellingPrice', 'gstRate'],
          where: { orgId },
        },
      ],
    });

    const rows = summaries.map((s: any) => ({
      itemId: s.itemId,
      itemName: s.item?.name,
      sku: s.item?.sku,
      uom: s.item?.unitOfMeasure,
      qtyOnHand: Number(s.qtyOnHand),
      avgCost: Number(s.avgCost),
      stockValue: Number(s.qtyOnHand) * Number(s.avgCost),
      sellingPrice: Number(s.item?.sellingPrice),
      marketValue: Number(s.qtyOnHand) * Number(s.item?.sellingPrice),
    }));

    const totalStockValue = rows.reduce((sum, r) => sum + r.stockValue, 0);
    return { rows, totalStockValue };
  }

  async getClientStockValuation(orgId: string, clientId: string, filters: any = {}) {
    const { rows } = await this.stockRepo.findAll({
      orgId,
      clientId,
      warehouseId: filters.warehouseId,
      page: 1,
      limit: 10000,
    });

    const grouped = new Map<string, any>();
    for (const movement of rows) {
      const item = (movement as any)._item;
      const warehouse = (movement as any)._warehouse;
      const key = `${movement.itemId}:${movement.warehouseId}:${movement.variantId ?? ''}`;
      const existing = grouped.get(key) ?? {
        itemId: movement.itemId,
        itemName: item?.name ?? null,
        sku: item?.sku ?? null,
        warehouseId: movement.warehouseId,
        warehouseName: warehouse?.name ?? null,
        variantId: movement.variantId ?? null,
        qtyOnHand: 0,
        avgCost: 0,
        stockValue: 0,
        uom: item?.unitOfMeasure ?? null,
      };

      const qtyIn = Number(movement.qtyIn ?? 0);
      const qtyOut = Number(movement.qtyOut ?? 0);
      const currentQty = Number(existing.qtyOnHand);
      if (qtyIn > 0) {
        existing.avgCost = StockValuationService.calculateWeightedAvg(
          currentQty,
          Number(existing.avgCost),
          qtyIn,
          Number(movement.rate ?? 0),
        );
      }
      existing.qtyOnHand = currentQty + qtyIn - qtyOut;
      existing.stockValue = existing.qtyOnHand * Number(existing.avgCost);
      grouped.set(key, existing);
    }

    const valuationRows = [...grouped.values()].filter((row) => row.qtyOnHand !== 0);
    return {
      rows: valuationRows,
      totalStockValue: valuationRows.reduce((sum, row) => sum + Number(row.stockValue ?? 0), 0),
    };
  }

  // ─── Low Stock Alerts ─────────────────────────────────────────────────────────

  async getLowStockItems(orgId: string) {
    const items = await ItemModel.findAll({
      where: { orgId, isActive: true, trackInventory: true },
    });

    const alerts: any[] = [];

    for (const item of items) {
      if (item.reorderPoint == null) continue;

      const summaries = await StockSummaryModel.findAll({ where: { itemId: item.id } });
      const totalQty = summaries.reduce((s: number, r: any) => s + Number(r.qtyOnHand), 0);

      if (totalQty <= item.reorderPoint) {
        alerts.push({
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          qtyOnHand: totalQty,
          reorderPoint: item.reorderPoint,
          reorderQty: item.reorderQty,
          severity: totalQty <= 0 ? 'out_of_stock' : 'low_stock',
        });
      }
    }

    return alerts;
  }

  // ─── Client Stock Summary (workspace tab) ─────────────────────────────────────

  async getClientStockSummary(orgId: string, clientId: string) {
    const movements = await this.stockRepo.getClientMovements(clientId, orgId);

    const summary = {
      totalPurchases: 0,
      totalSales: 0,
      purchasedQty: 0,
      soldQty: 0,
      purchaseValue: 0,
      saleValue: 0,
      movements: movements.map((m) => ({
        id: m.id,
        transactionType: m.transactionType,
        transactionDate: m.transactionDate,
        itemId: m.itemId,
        qtyIn: m.qtyIn,
        qtyOut: m.qtyOut,
        rate: m.rate,
        value: (m.qtyIn + m.qtyOut) * m.rate,
        notes: m.notes,
      })),
    };

    for (const m of movements) {
      if (m.transactionType === 'purchase') {
        summary.totalPurchases++;
        summary.purchasedQty += m.qtyIn;
        summary.purchaseValue += m.qtyIn * m.rate;
      }
      if (m.transactionType === 'sale') {
        summary.totalSales++;
        summary.soldQty += m.qtyOut;
        summary.saleValue += m.qtyOut * m.rate;
      }
    }

    return summary;
  }

  private async lockStockKey(
    transaction: Transaction,
    dto: Pick<StockMovementDTO, 'warehouseId' | 'itemId' | 'variantId' | 'batchNo'>,
  ) {
    if (sequelize.getDialect() !== 'postgres') return;

    await sequelize.query(
      'SELECT pg_advisory_xact_lock(hashtext(:lockKey))',
      {
        replacements: {
          lockKey: [
            'stock',
            dto.warehouseId,
            dto.itemId,
            dto.variantId ?? 'base',
            dto.batchNo ?? 'base',
          ].join(':'),
        },
        transaction,
      },
    );
  }
}
