import { injectable } from 'tsyringe';
import { Op } from 'sequelize';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { Item as ItemEntity } from '../../domain/entities/Item.entity';
import { Item as ItemModel, ItemVariant as ItemVariantModel, ItemCategory as ItemCategoryModel } from '../../../../models';

function toEntity(raw: any): ItemEntity {
  const result = ItemEntity.create({
    organizationId: raw.orgId,
    name: raw.name,
    sku: raw.sku,
    barcode: raw.barcode,
    hsnSacCode: raw.hsnSacCode,
    itemType: raw.itemType,
    unitOfMeasure: raw.unitOfMeasure,
    purchasePrice: Number(raw.purchasePrice),
    sellingPrice: Number(raw.sellingPrice),
    mrp: raw.mrp != null ? Number(raw.mrp) : null,
    gstRate: Number(raw.gstRate),
    cessRate: Number(raw.cessRate),
    trackInventory: raw.trackInventory,
    allowNegativeStock: raw.allowNegativeStock,
    reorderPoint: raw.reorderPoint,
    reorderQty: raw.reorderQty,
    categoryId: raw.categoryId,
    isActive: raw.isActive,
    description: raw.description,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }, raw.id);
  if (result.isFailure) throw new Error(result.getError() as string);
  const entity = result.getValue();
  (entity as any)._variants = raw.variants ?? [];
  return entity;
}

function toPersistence(entity: ItemEntity): any {
  return {
    id: entity.id,
    orgId: entity.organizationId,
    name: entity.name,
    sku: entity.sku,
    barcode: entity.barcode,
    hsnSacCode: entity.hsnSacCode,
    itemType: entity.itemType,
    unitOfMeasure: entity.unitOfMeasure,
    purchasePrice: entity.purchasePrice,
    sellingPrice: entity.sellingPrice,
    mrp: entity.mrp,
    gstRate: entity.gstRate,
    cessRate: entity.cessRate,
    trackInventory: entity.trackInventory,
    allowNegativeStock: entity.allowNegativeStock,
    reorderPoint: entity.reorderPoint,
    reorderQty: entity.reorderQty,
    categoryId: entity.categoryId,
    isActive: entity.isActive,
    description: entity.description,
  };
}

const INCLUDE = [
  { model: ItemVariantModel,  as: 'variants',  required: false },
  { model: ItemCategoryModel, as: 'category',  attributes: ['id', 'name'], required: false },
];

@injectable()
export class SequelizeItemRepository implements IItemRepository {
  async save(item: ItemEntity): Promise<ItemEntity> {
    const data = toPersistence(item);
    const [model] = await ItemModel.upsert(data);
    const refreshed = await ItemModel.findByPk(model.id, { include: INCLUDE });
    return toEntity(refreshed!);
  }

  async findById(id: string, orgId: string): Promise<ItemEntity | null> {
    const row = await ItemModel.findOne({ where: { id, orgId }, include: INCLUDE });
    return row ? toEntity(row) : null;
  }

  async findBySku(sku: string, orgId: string): Promise<ItemEntity | null> {
    const row = await ItemModel.findOne({ where: { sku, orgId }, include: INCLUDE });
    return row ? toEntity(row) : null;
  }

  async findByBarcode(barcode: string, orgId: string): Promise<ItemEntity | null> {
    const row = await ItemModel.findOne({ where: { barcode, orgId }, include: INCLUDE });
    return row ? toEntity(row) : null;
  }

  async findAll(orgId: string, filters: any, pagination: any): Promise<{ items: ItemEntity[]; total: number }> {
    const where: any = { orgId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.itemType)  where.itemType  = filters.itemType;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.search) {
      where[Op.or] = [
        { name:    { [Op.iLike]: `%${filters.search}%` } },
        { sku:     { [Op.iLike]: `%${filters.search}%` } },
        { barcode: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const page  = Number(pagination?.page  ?? 1);
    const limit = Number(pagination?.limit ?? 20);

    const { rows, count } = await ItemModel.findAndCountAll({
      where,
      include: INCLUDE,
      offset: (page - 1) * limit,
      limit,
      order: [['name', 'ASC']],
      distinct: true,
    });

    return { items: rows.map(toEntity), total: count };
  }

  async delete(id: string, orgId: string): Promise<void> {
    await ItemModel.update({ isActive: false }, { where: { id, orgId } });
  }
}
