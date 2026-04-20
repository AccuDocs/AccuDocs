/**
 * ClientPricingService — pure domain service.
 * Resolves the effective selling price for a client-item combination.
 */

export interface ClientPricingRecord {
  customSellingPrice: number;
  discountPct: number;
  validFrom?: string | null;
  validTo?: string | null;
}

export class ClientPricingService {
  /**
   * Check whether a pricing record is valid on the given date.
   */
  static isValid(record: ClientPricingRecord, date: Date): boolean {
    const d = date.getTime();
    if (record.validFrom) {
      const from = new Date(record.validFrom).getTime();
      if (d < from) return false;
    }
    if (record.validTo) {
      const to = new Date(record.validTo).getTime();
      if (d > to) return false;
    }
    return true;
  }

  /**
   * Return the effective unit price for a client.
   * Falls back to item.sellingPrice if no override exists or is in date.
   */
  static getEffectivePrice(
    itemSellingPrice: number,
    pricing: ClientPricingRecord | null,
    date: Date = new Date(),
  ): number {
    if (!pricing) return itemSellingPrice;
    if (!this.isValid(pricing, date)) return itemSellingPrice;

    const basePrice = pricing.customSellingPrice;
    const discountAmt = basePrice * (pricing.discountPct / 100);
    return Math.max(0, basePrice - discountAmt);
  }

  /**
   * Apply a percentage discount on top of a price.
   */
  static applyDiscount(price: number, discountPct: number): number {
    return Math.max(0, price * (1 - discountPct / 100));
  }
}
