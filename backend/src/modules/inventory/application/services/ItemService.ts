import { injectable, inject } from 'tsyringe';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { IClientItemPricingRepository } from '../../domain/repositories/IClientItemPricingRepository';
import { Item } from '../../domain/entities/Item.entity';
import { ClientPricingService } from '../../domain/services/ClientPricingService';
import { AppError } from '../../../../utils/errors';
import {
  Item as ItemModel,
  ItemVariant as ItemVariantModel,
  StockLedger as StockLedgerModel,
  Warehouse as WarehouseModel,
} from '../../../../models';

@injectable()
export class ItemService {
  constructor(
    @inject('IItemRepository') private itemRepo: IItemRepository,
    @inject('IClientItemPricingRepository') private pricingRepo: IClientItemPricingRepository,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async createItem(orgId: string, data: any): Promise<Item> {
    const itemResult = Item.create({
      organizationId: orgId,
      name: data.name,
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      hsnSacCode: data.hsnSacCode ?? null,
      itemType: data.itemType ?? 'goods',
      unitOfMeasure: data.unitOfMeasure ?? 'PCS',
      purchasePrice: Number(data.purchasePrice ?? 0),
      sellingPrice: Number(data.sellingPrice ?? 0),
      mrp: data.mrp != null ? Number(data.mrp) : null,
      gstRate: Number(data.gstRate ?? 18),
      cessRate: Number(data.cessRate ?? 0),
      trackInventory: data.trackInventory !== false,
      allowNegativeStock: data.allowNegativeStock === true,
      reorderPoint: data.reorderPoint ?? null,
      reorderQty: data.reorderQty ?? null,
      categoryId: data.categoryId ?? null,
      isActive: data.isActive !== false,
      description: data.description ?? null,
    });
    if (itemResult.isFailure) throw new AppError(itemResult.getError() as string, 400);
    return this.itemRepo.save(itemResult.getValue());
  }

  async getItems(orgId: string, filters: any, pagination: any) {
    return this.itemRepo.findAll(orgId, filters, pagination);
  }

  async getItemById(orgId: string, id: string) {
    const item = await this.itemRepo.findById(id, orgId);
    if (!item) throw new AppError('Item not found', 404);
    return item;
  }

  async updateItem(orgId: string, id: string, data: any): Promise<Item> {
    const existing = await this.itemRepo.findById(id, orgId);
    if (!existing) throw new AppError('Item not found', 404);

    (existing as any).props.name = data.name ?? existing.name;
    (existing as any).props.sku = data.sku ?? existing.sku;
    (existing as any).props.barcode = data.barcode ?? existing.barcode;
    (existing as any).props.hsnSacCode = data.hsnSacCode ?? existing.hsnSacCode;
    (existing as any).props.itemType = data.itemType ?? existing.itemType;
    (existing as any).props.unitOfMeasure = data.unitOfMeasure ?? existing.unitOfMeasure;
    (existing as any).props.purchasePrice = data.purchasePrice != null ? Number(data.purchasePrice) : existing.purchasePrice;
    (existing as any).props.sellingPrice = data.sellingPrice != null ? Number(data.sellingPrice) : existing.sellingPrice;
    (existing as any).props.mrp = data.mrp != null ? Number(data.mrp) : existing.mrp;
    (existing as any).props.gstRate = data.gstRate != null ? Number(data.gstRate) : existing.gstRate;
    (existing as any).props.cessRate = data.cessRate != null ? Number(data.cessRate) : existing.cessRate;
    (existing as any).props.trackInventory = data.trackInventory ?? existing.trackInventory;
    (existing as any).props.allowNegativeStock = data.allowNegativeStock ?? existing.allowNegativeStock;
    (existing as any).props.reorderPoint = data.reorderPoint ?? existing.reorderPoint;
    (existing as any).props.reorderQty = data.reorderQty ?? existing.reorderQty;
    (existing as any).props.categoryId = data.categoryId ?? existing.categoryId;
    (existing as any).props.isActive = data.isActive ?? existing.isActive;
    (existing as any).props.description = data.description ?? existing.description;

    return this.itemRepo.save(existing);
  }

  async deleteItem(orgId: string, id: string) {
    await this.itemRepo.findById(id, orgId).then(i => { if (!i) throw new AppError('Item not found', 404); });
    await this.itemRepo.delete(id, orgId);
  }

  // ─── Variants ─────────────────────────────────────────────────────────────────

  async addVariant(orgId: string, itemId: string, data: any) {
    const item = await this.itemRepo.findById(itemId, orgId);
    if (!item) throw new AppError('Item not found', 404);

    return ItemVariantModel.create({
      itemId,
      variantName: data.variantName,
      skuSuffix: data.skuSuffix ?? null,
      barcode: data.barcode ?? null,
      additionalPrice: Number(data.additionalPrice ?? 0),
      attributes: data.attributes ?? {},
      isActive: data.isActive !== false,
    });
  }

  async updateVariant(orgId: string, itemId: string, variantId: string, data: any) {
    const item = await this.itemRepo.findById(itemId, orgId);
    if (!item) throw new AppError('Item not found', 404);

    const variant = await ItemVariantModel.findOne({ where: { id: variantId, itemId } });
    if (!variant) throw new AppError('Variant not found', 404);

    return variant.update({
      variantName: data.variantName ?? variant.variantName,
      skuSuffix: data.skuSuffix ?? variant.skuSuffix,
      barcode: data.barcode ?? variant.barcode,
      additionalPrice: data.additionalPrice != null ? Number(data.additionalPrice) : variant.additionalPrice,
      attributes: data.attributes ?? variant.attributes,
      isActive: data.isActive ?? variant.isActive,
    });
  }

  async getVariants(orgId: string, itemId: string) {
    const item = await this.itemRepo.findById(itemId, orgId);
    if (!item) throw new AppError('Item not found', 404);
    return ItemVariantModel.findAll({ where: { itemId, isActive: true } });
  }

  // ─── Barcode Search ───────────────────────────────────────────────────────────

  async searchByBarcode(orgId: string, barcode: string) {
    const item = await this.itemRepo.findByBarcode(barcode, orgId);
    if (!item) throw new AppError('Item not found for barcode', 404);

    // Include stock across all warehouses
    const stockRows = await StockLedgerModel.findAll({
      attributes: ['warehouseId', 'runningBalance'],
      where: { orgId, itemId: item.id },
      include: [{ model: WarehouseModel, as: 'warehouse', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    });

    return { item, stock: stockRows };
  }

  // ─── Client Pricing ───────────────────────────────────────────────────────────

  async getEffectivePriceForClient(orgId: string, itemId: string, clientId: string, variantId?: string | null): Promise<number> {
    const item = await this.itemRepo.findById(itemId, orgId);
    if (!item) throw new AppError('Item not found', 404);

    const pricing = await this.pricingRepo.findEffective(clientId, itemId, variantId ?? null);
    return ClientPricingService.getEffectivePrice(item.sellingPrice, pricing);
  }

  async setClientPrice(orgId: string, clientId: string, itemId: string, data: any) {
    const item = await this.itemRepo.findById(itemId, orgId);
    if (!item) throw new AppError('Item not found', 404);

    return this.pricingRepo.upsert({
      clientId,
      itemId,
      variantId: data.variantId ?? null,
      customSellingPrice: Number(data.customSellingPrice),
      discountPct: Number(data.discountPct ?? 0),
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    });
  }

  async getClientPricingList(clientId: string) {
    return this.pricingRepo.findByClient(clientId);
  }
}
