import { injectable } from 'tsyringe';
import { IStockTransferRepository } from '../../domain/repositories/IStockTransferRepository';
import {
  StockTransfer as StockTransferModel,
  StockTransferItem as StockTransferItemModel,
} from '../../../../models';
import { sequelize } from '../../../../config/database.config';

const INCLUDE = [
  {
    model: StockTransferItemModel,
    as: 'transferItems',
    required: false,
  },
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
    const [result] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM stock_transfers WHERE org_id = :orgId`,
      { replacements: { orgId } },
    );
    const cnt = Number((result as any[])[0]?.cnt ?? 0) + 1;
    const year = new Date().getFullYear().toString().slice(-2);
    return `TRF/${year}/${String(cnt).padStart(4, '0')}`;
  }
}
