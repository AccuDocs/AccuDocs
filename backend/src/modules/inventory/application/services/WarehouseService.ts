import { injectable, inject } from 'tsyringe';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { IStockLedgerRepository } from '../../domain/repositories/IStockLedgerRepository';
import { Warehouse } from '../../domain/entities/Warehouse.entity';
import { AppError } from '../../../../utils/errors';
import {
  StockSummary as StockSummaryModel,
  Item as ItemModel,
  ItemVariant as ItemVariantModel,
} from '../../../../models';

@injectable()
export class WarehouseService {
  constructor(
    @inject('IWarehouseRepository') private warehouseRepo: IWarehouseRepository,
    @inject('IStockLedgerRepository') private stockRepo: IStockLedgerRepository,
  ) {}

  async createWarehouse(orgId: string, data: any): Promise<Warehouse> {
    const result = Warehouse.create({
      orgId,
      branchId: data.branchId ?? null,
      name: data.name,
      code: data.code?.toUpperCase(),
      address: data.address ?? null,
      gstin: data.gstin ?? null,
      isActive: data.isActive !== false,
      isDefault: data.isDefault === true,
    });
    if (result.isFailure) throw new AppError(result.getError() as string, 400);
    return this.warehouseRepo.save(result.getValue());
  }

  async getWarehouses(orgId: string): Promise<Warehouse[]> {
    return this.warehouseRepo.findAll(orgId);
  }

  async getWarehouseById(orgId: string, id: string): Promise<Warehouse> {
    const wh = await this.warehouseRepo.findById(id, orgId);
    if (!wh) throw new AppError('Warehouse not found', 404);
    return wh;
  }

  async updateWarehouse(orgId: string, id: string, data: any): Promise<Warehouse> {
    const existing = await this.warehouseRepo.findById(id, orgId);
    if (!existing) throw new AppError('Warehouse not found', 404);

    (existing as any).props.name = data.name ?? existing.name;
    (existing as any).props.code = data.code?.toUpperCase() ?? existing.code;
    (existing as any).props.address = data.address ?? existing.address;
    (existing as any).props.gstin = data.gstin ?? existing.gstin;
    (existing as any).props.isActive = data.isActive ?? existing.isActive;
    (existing as any).props.isDefault = data.isDefault ?? existing.isDefault;

    return this.warehouseRepo.save(existing);
  }

  async deleteWarehouse(orgId: string, id: string) {
    const wh = await this.warehouseRepo.findById(id, orgId);
    if (!wh) throw new AppError('Warehouse not found', 404);
    await this.warehouseRepo.delete(id, orgId);
  }

  // ─── Stock Summary for a Warehouse ───────────────────────────────────────────

  async getStockSummary(orgId: string, warehouseId: string, filters: any = {}) {
    const wh = await this.warehouseRepo.findById(warehouseId, orgId);
    if (!wh) throw new AppError('Warehouse not found', 404);

    const where: any = { warehouseId };

    const rows = await StockSummaryModel.findAll({
      where,
      include: [
        {
          model: ItemModel,
          as: 'item',
          attributes: ['id', 'name', 'sku', 'unitOfMeasure', 'sellingPrice', 'gstRate', 'reorderPoint'],
          where: { orgId },
        },
        {
          model: ItemVariantModel,
          as: 'variant',
          attributes: ['id', 'variantName', 'skuSuffix'],
          required: false,
        },
      ],
      order: [['lastUpdated', 'DESC']],
    });

    return rows;
  }

  // ─── Client workspace: all stock movements linked to a client ─────────────────

  async getClientStockHistory(orgId: string, clientId: string) {
    const movements = await this.stockRepo.getClientMovements(clientId, orgId);
    return movements;
  }
}
