import { injectable } from 'tsyringe';
import { IPurchaseOrderRepository } from '../../domain/repositories/IPurchaseOrderRepository';
import { PurchaseOrder as POEntity } from '../../domain/entities/PurchaseOrder.entity';
import {
  PurchaseOrder as POModel,
  PurchaseOrderItem as POItemModel,
  Client as ClientModel,
  Warehouse as WarehouseModel,
} from '../../../../models';
import { sequelize } from '../../../../config/database.config';

function toEntity(raw: any): POEntity {
  const result = POEntity.create({
    orgId: raw.orgId,
    branchId: raw.branchId,
    supplierClientId: raw.supplierClientId,
    poNumber: raw.poNumber,
    poDate: new Date(raw.poDate),
    expectedDeliveryDate: raw.expectedDeliveryDate ? new Date(raw.expectedDeliveryDate) : null,
    warehouseId: raw.warehouseId,
    status: raw.status,
    subtotal: Number(raw.subtotal),
    gstAmount: Number(raw.gstAmount),
    total: Number(raw.total),
    notes: raw.notes,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }, raw.id);
  if (result.isFailure) throw new Error(result.getError() as string);
  const entity = result.getValue();
  (entity as any)._items = raw.items ?? [];
  (entity as any)._supplier = raw.supplier ?? null;
  (entity as any)._warehouse = raw.warehouse ?? null;
  return entity;
}

const INCLUDE = [
  {
    model: POItemModel,
    as: 'items',
    include: [{ model: require('../../../../models').Item, as: 'item', attributes: ['id', 'name', 'sku', 'unitOfMeasure'] }],
    required: false,
  },
  { model: ClientModel,   as: 'supplier',  attributes: ['id', 'name', 'gstin', 'mobile'], required: false },
  { model: WarehouseModel, as: 'warehouse', attributes: ['id', 'name', 'code'],            required: false },
];

@injectable()
export class SequelizePurchaseOrderRepository implements IPurchaseOrderRepository {
  async save(po: POEntity, lineItems?: any[]): Promise<POEntity> {
    const t = await sequelize.transaction();
    try {
      const [model] = await POModel.upsert({
        id: po.id,
        orgId: po.orgId,
        branchId: po.branchId,
        supplierClientId: po.supplierClientId,
        poNumber: po.poNumber,
        poDate: po.poDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        warehouseId: po.warehouseId,
        status: po.status,
        subtotal: po.subtotal,
        gstAmount: po.gstAmount,
        total: po.total,
        notes: po.notes,
        createdBy: po.createdBy,
      }, { transaction: t });

      if (lineItems && lineItems.length > 0) {
        await POItemModel.destroy({ where: { poId: model.id }, transaction: t });
        await POItemModel.bulkCreate(lineItems.map(li => ({ ...li, poId: model.id })), { transaction: t });
      }

      await t.commit();
      const refreshed = await POModel.findByPk(model.id, { include: INCLUDE });
      return toEntity(refreshed!);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async findById(id: string, orgId: string): Promise<POEntity | null> {
    const row = await POModel.findOne({ where: { id, orgId }, include: INCLUDE });
    return row ? toEntity(row) : null;
  }

  async findAll(orgId: string, filters: any, pagination: any): Promise<{ rows: POEntity[]; total: number }> {
    const where: any = { orgId };
    if (filters.status)          where.status          = filters.status;
    if (filters.supplierClientId) where.supplierClientId = filters.supplierClientId;

    const page  = Number(pagination?.page  ?? 1);
    const limit = Number(pagination?.limit ?? 20);

    const { rows, count } = await POModel.findAndCountAll({
      where,
      include: INCLUDE,
      offset: (page - 1) * limit,
      limit,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return { rows: rows.map(toEntity), total: count };
  }

  async findByClient(clientId: string, orgId: string): Promise<POEntity[]> {
    const rows = await POModel.findAll({
      where: { supplierClientId: clientId, orgId },
      include: INCLUDE,
      order: [['created_at', 'DESC']],
    });
    return rows.map(toEntity);
  }

  async generatePoNumber(orgId: string): Promise<string> {
    const [result] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM purchase_orders WHERE org_id = :orgId`,
      { replacements: { orgId } },
    );
    const cnt = Number((result as any[])[0]?.cnt ?? 0) + 1;
    const year = new Date().getFullYear().toString().slice(-2);
    return `PO/${year}/${String(cnt).padStart(4, '0')}`;
  }
}
