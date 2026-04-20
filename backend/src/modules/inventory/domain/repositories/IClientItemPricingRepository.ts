export interface IClientItemPricingRepository {
  upsert(data: {
    clientId: string;
    itemId: string;
    variantId?: string | null;
    customSellingPrice: number;
    discountPct?: number;
    validFrom?: string | null;
    validTo?: string | null;
  }): Promise<any>;
  findEffective(clientId: string, itemId: string, variantId?: string | null, date?: Date): Promise<any | null>;
  findByClient(clientId: string): Promise<any[]>;
  findByItem(itemId: string): Promise<any[]>;
}
