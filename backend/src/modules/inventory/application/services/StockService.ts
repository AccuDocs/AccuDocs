import { injectable, inject } from 'tsyringe';
import { IStockLedgerRepository } from '../../domain/repositories/IStockLedgerRepository';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { StockMovement, TransactionType, ValuationMethod } from '../../domain/entities/StockMovement.entity';
import { StockValuationService } from '../../domain/services/StockValuationService';
import { AppError } from '../../../../utils/errors';
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

@injectable()
export class StockService {
  constructor(
    @inject('IStockLedgerRepository') private stockRepo: IStockLedgerRepository,
    @inject('IWarehouseRepository') private warehouseRepo: IWarehouseRepository,
  ) {}

  // ─── Core: Record Movement ────────────────────────────────────────────────────

  async recordMovement(dto: StockMovementDTO): Promise<StockMovement> {
    const qtyIn  = Number(dto.qtyIn  ?? 0);
    const qtyOut = Number(dto.qtyOut ?? 0);
    const rate   = Number(dto.rate   ?? 0);

    // Fetch item to check allow_negative_stock flag
    const item = await ItemModel.findOne({ where: { id: dto.itemId, orgId: dto.orgId } });
    if (!item) throw new AppError('Item not found', 404);

    if (!item.trackInventory && dto.transactionType !== 'adjustment') {
      // Services don't track inventory — still write ledger entry but skip stock check
    } else if (qtyOut > 0) {
      const currentBalance = await this.stockRepo.getCurrentBalance(dto.warehouseId, dto.itemId, dto.variantId);
      const check = StockValuationService.checkNegativeStock(
        currentBalance,
        qtyOut,
        item.allowNegativeStock,
      );
      if (!check.allowed) throw new AppError(check.message!, 422);
    }

    // Compute running balance
    const currentBalance = await this.stockRepo.getCurrentBalance(dto.warehouseId, dto.itemId, dto.variantId);
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

    const saved = await this.stockRepo.append(movementResult.getValue());

    // Update stock_summary synchronously
    await this.stockRepo.updateStockSummary(
      dto.warehouseId,
      dto.itemId,
      dto.variantId ?? null,
      dto.batchNo ?? null,
      qtyIn,
      qtyOut,
      rate,
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
    const current = await this.stockRepo.getCurrentBalance(dto.warehouseId, dto.itemId, dto.variantId);
    const diff = dto.adjustedQty - current;
    return this.recordMovement({
      ...dto,
      transactionType: 'adjustment',
      qtyIn:  diff > 0 ? diff : 0,
      qtyOut: diff < 0 ? Math.abs(diff) : 0,
      referenceType: 'manual',
      notes: dto.reason ?? dto.notes,
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
}
