import { injectable } from 'tsyringe';
import { Op } from 'sequelize';
import { IClientItemPricingRepository } from '../../domain/repositories/IClientItemPricingRepository';
import { ClientItemPricing as ClientItemPricingModel } from '../../../../models';

@injectable()
export class SequelizeClientItemPricingRepository implements IClientItemPricingRepository {
  async upsert(data: {
    clientId: string;
    itemId: string;
    variantId?: string | null;
    customSellingPrice: number;
    discountPct?: number;
    validFrom?: string | null;
    validTo?: string | null;
  }): Promise<any> {
    const [record] = await ClientItemPricingModel.upsert({
      clientId: data.clientId,
      itemId: data.itemId,
      variantId: data.variantId ?? null,
      customSellingPrice: data.customSellingPrice,
      discountPct: data.discountPct ?? 0,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    });
    return record;
  }

  async findEffective(
    clientId: string,
    itemId: string,
    variantId?: string | null,
    date: Date = new Date(),
  ): Promise<any | null> {
    const dateStr = date.toISOString().split('T')[0];
    const where: any = { clientId, itemId, variantId: variantId ?? null };

    // Date range: valid_from <= date AND (valid_to >= date OR valid_to IS NULL)
    where[Op.and] = [
      { [Op.or]: [{ validFrom: null }, { validFrom: { [Op.lte]: dateStr } }] },
      { [Op.or]: [{ validTo:   null }, { validTo:   { [Op.gte]: dateStr } }] },
    ];

    return ClientItemPricingModel.findOne({ where });
  }

  async findByClient(clientId: string): Promise<any[]> {
    return ClientItemPricingModel.findAll({ where: { clientId }, order: [['createdAt', 'DESC']] });
  }

  async findByItem(itemId: string): Promise<any[]> {
    return ClientItemPricingModel.findAll({ where: { itemId }, order: [['createdAt', 'DESC']] });
  }
}
