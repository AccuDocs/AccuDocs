import { injectable } from 'tsyringe';
import { QueryTypes } from 'sequelize';
import { IStockTransferRepository } from '../../domain/repositories/IStockTransferRepository';
import {
  StockTransfer as StockTransferModel,
  StockTransferItem as StockTransferItemModel,
  Warehouse as WarehouseModel,
  Client as ClientModel,
  Item as ItemModel,
  ItemVariant as ItemVariantModel,
} from '../../../../models';
import { sequelize } from '../../../../config/database.config';

const INCLUDE = [
  {
    model: StockTransferItemModel,
    as: 'transferItems',
    include: [
      { model: ItemModel, as: 'item', attributes: ['id', 'name', 'sku', 'unitOfMeasure'], required: false },
      { model: ItemVariantModel, as: 'variant', attributes: ['id', 'variantName'], required: false },
    ],
    required: false,
  },
  { model: WarehouseModel, as: 'fromWarehouse', attributes: ['id', 'name', 'code'], required: false },
  { model: WarehouseModel, as: 'toWarehouse', attributes: ['id', 'name', 'code'], required: false },
  { model: ClientModel, as: 'client', attributes: ['id', 'name'], required: false },
];

@injectable()
export class SequelizeStockTransferRepository implements IStockTransferRepository {
  async save(transfer: any, lineItems?: any[]): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const [model] = await StockTransferModel.upsert({
        id: transfer.id,
        orgId: transfer.orgId,
        transferNo: transfer.transferNo,
        transferDate: transfer.transferDate,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        clientId: transfer.clientId ?? null,
        status: transfer.status,
        notes: transfer.notes,
        createdBy: transfer.createdBy,
      }, { transaction: t });

      if (lineItems && lineItems.length > 0) {
        await StockTransferItemModel.destroy({ where: { transferId: model.id }, transaction: t });
        await StockTransferItemModel.bulkCreate(
          lineItems.map(li => ({ ...li, transferId: model.id })),
          { transaction: t },
        );
      }

      await t.commit();
      return StockTransferModel.findByPk(model.id, { include: INCLUDE });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async findById(id: string, orgId: string): Promise<any | null> {
    return StockTransferModel.findOne({ where: { id, orgId }, include: INCLUDE });
  }

  async findAll(orgId: string, filters: any): Promise<{ rows: any[]; total: number }> {
    const where: any = { orgId };
    if (filters.status) where.status = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;

    const page  = Number(filters.page  ?? 1);
    const limit = Number(filters.limit ?? 20);

    const { rows, count } = await StockTransferModel.findAndCountAll({
      where,
      include: INCLUDE,
      offset: (page - 1) * limit,
      limit,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return { rows, total: count };
  }

  async generateTransferNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    return sequelize.transaction(async (transaction) => {
      const rows = await sequelize.query<{ current_value: number }>(
        `
          INSERT INTO inventory_number_sequences (org_id, sequence_type, current_value, created_at, updated_at)
          VALUES (:orgId, :sequenceType, 1, NOW(), NOW())
          ON CONFLICT (org_id, sequence_type)
          DO UPDATE SET current_value = inventory_number_sequences.current_value + 1, updated_at = NOW()
          RETURNING current_value
        `,
        {
          replacements: { orgId, sequenceType: 'stock_transfer' },
          type: QueryTypes.SELECT,
          transaction,
        },
      );
      const nextValue = Number(rows[0]?.current_value ?? 1);
      return `TRF/${year}/${String(nextValue).padStart(4, '0')}`;
    });
  }
}
