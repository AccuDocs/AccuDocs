import { injectable } from 'tsyringe';
import { Op, Transaction } from 'sequelize';
import { IStockLedgerRepository, StockLedgerFilters } from '../../domain/repositories/IStockLedgerRepository';
import { StockMovement as StockMovementEntity } from '../../domain/entities/StockMovement.entity';
import {
  StockLedger as StockLedgerModel,
  StockSummary as StockSummaryModel,
  Item as ItemModel,
  Warehouse as WarehouseModel,
  ItemVariant as ItemVariantModel,
  Client as ClientModel,
} from '../../../../models';
import { StockValuationService } from '../../domain/services/StockValuationService';

function toEntity(raw: any): StockMovementEntity {
  const result = StockMovementEntity.create({
    orgId: raw.orgId,
    warehouseId: raw.warehouseId,
    itemId: raw.itemId,
    variantId: raw.variantId,
    transactionType: raw.transactionType,
    referenceType: raw.referenceType,
    referenceId: raw.referenceId,
    clientId: raw.clientId,
    batchNo: raw.batchNo,
    serialNo: raw.serialNo,
    qtyIn: Number(raw.qtyIn),
    qtyOut: Number(raw.qtyOut),
    rate: Number(raw.rate),
    valuationMethod: raw.valuationMethod,
    runningBalance: Number(raw.runningBalance),
    transactionDate: new Date(raw.transactionDate),
    notes: raw.notes,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
  }, raw.id);
  if (result.isFailure) throw new Error(result.getError() as string);
  const entity = result.getValue();
  // Attach included models for caller convenience
  (entity as any)._item = raw.item ?? null;
  (entity as any)._warehouse = raw.warehouse ?? null;
  (entity as any)._client = raw.client ?? null;
  return entity;
}

@injectable()
export class SequelizeStockLedgerRepository implements IStockLedgerRepository {
  async append(movement: StockMovementEntity, options?: { transaction?: Transaction }): Promise<StockMovementEntity> {
    const row = await StockLedgerModel.create({
      id: movement.id,
      orgId: movement.orgId,
      warehouseId: movement.warehouseId,
      itemId: movement.itemId,
      variantId: movement.variantId,
      transactionType: movement.transactionType,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      clientId: movement.clientId,
      batchNo: movement.batchNo,
      serialNo: movement.serialNo,
      qtyIn: movement.qtyIn,
      qtyOut: movement.qtyOut,
      rate: movement.rate,
      valuationMethod: movement.valuationMethod,
      runningBalance: movement.runningBalance,
      transactionDate: movement.transactionDate,
      notes: movement.notes,
      createdBy: movement.createdBy,
    }, { transaction: options?.transaction });
    return toEntity(row);
  }

  async findAll(filters: StockLedgerFilters): Promise<{ rows: StockMovementEntity[]; total: number }> {
    const where: any = { orgId: filters.orgId };
    if (filters.warehouseId)    where.warehouseId    = filters.warehouseId;
    if (filters.itemId)         where.itemId         = filters.itemId;
    if (filters.clientId)       where.clientId       = filters.clientId;
    if (filters.transactionType) where.transactionType = filters.transactionType;
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate[Op.gte] = filters.startDate;
      if (filters.endDate)   where.transactionDate[Op.lte] = filters.endDate;
    }

    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;

    const { rows, count } = await StockLedgerModel.findAndCountAll({
      where,
      include: [
        { model: ItemModel,     as: 'item',      attributes: ['id', 'name', 'sku', 'unitOfMeasure'], required: false },
        { model: WarehouseModel, as: 'warehouse', attributes: ['id', 'name', 'code'],               required: false },
        { model: ItemVariantModel, as: 'variant', attributes: ['id', 'variantName'],                required: false },
        { model: ClientModel, as: 'client', attributes: ['id', 'name'], required: false },
      ],
      offset: (page - 1) * limit,
      limit,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return { rows: rows.map(toEntity), total: count };
  }

  async getCurrentBalance(
    warehouseId: string,
    itemId: string,
    variantId?: string | null,
    batchNo?: string | null,
    options?: { transaction?: Transaction; lock?: boolean },
  ): Promise<number> {
    const summary = await StockSummaryModel.findOne({
      where: {
        warehouseId,
        itemId,
        variantId: variantId ?? null,
        batchNo: batchNo ?? null,
      },
      transaction: options?.transaction,
      lock: options?.lock && options.transaction ? (options.transaction as any).LOCK.UPDATE : undefined,
    });
    return summary ? Number((summary as any).qtyOnHand) : 0;
  }

  async getClientMovements(clientId: string, orgId: string): Promise<StockMovementEntity[]> {
    const rows = await StockLedgerModel.findAll({
      where: { clientId, orgId },
      include: [
        { model: ItemModel,      as: 'item',      attributes: ['id', 'name', 'sku'], required: false },
        { model: WarehouseModel, as: 'warehouse', attributes: ['id', 'name'],        required: false },
      ],
      order: [['transaction_date', 'DESC']],
    });
    return rows.map(toEntity);
  }

  async updateStockSummary(
    warehouseId: string,
    itemId: string,
    variantId: string | null,
    batchNo: string | null,
    qtyIn: number,
    qtyOut: number,
    rate: number,
    options?: { transaction?: Transaction; allowNegativeStock?: boolean },
  ): Promise<void> {
    const existing = await StockSummaryModel.findOne({
      where: { warehouseId, itemId, variantId: variantId ?? null, batchNo: batchNo ?? null },
      transaction: options?.transaction,
      lock: options?.transaction ? (options.transaction as any).LOCK.UPDATE : undefined,
    });

    if (existing) {
      const existingQty  = Number((existing as any).qtyOnHand);
      const existingAvg  = Number((existing as any).avgCost);
      const newQtyOnHand = existingQty + qtyIn - qtyOut;
      if (!options?.allowNegativeStock && newQtyOnHand < 0) {
        throw new Error('Stock summary would become negative');
      }
      const newAvgCost   = qtyIn > 0
        ? StockValuationService.calculateWeightedAvg(existingQty, existingAvg, qtyIn, rate)
        : existingAvg;

      await existing.update({
        qtyOnHand: options?.allowNegativeStock ? newQtyOnHand : Math.max(0, newQtyOnHand),
        avgCost: newAvgCost,
        lastPurchaseRate: qtyIn > 0 ? rate : (existing as any).lastPurchaseRate,
        lastUpdated: new Date(),
      }, { transaction: options?.transaction });
    } else {
      const initialQty = qtyIn - qtyOut;
      if (!options?.allowNegativeStock && initialQty < 0) {
        throw new Error('Stock summary would become negative');
      }
      await StockSummaryModel.create({
        warehouseId,
        itemId,
        variantId: variantId ?? null,
        batchNo: batchNo ?? null,
        qtyOnHand: options?.allowNegativeStock ? initialQty : Math.max(0, initialQty),
        qtyReserved: 0,
        avgCost: rate,
        lastPurchaseRate: rate,
        lastUpdated: new Date(),
      }, { transaction: options?.transaction });
    }
  }
}
