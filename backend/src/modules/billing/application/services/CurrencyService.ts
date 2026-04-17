import { injectable } from 'tsyringe';
import { CurrencyRate } from '../../../../models/currency-rate.model';
import { logger } from '../../../../utils/logger';

// Supported currencies for Indian CA firms
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CHF',
  'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'MYR', 'THB', 'HKD', 'NZD',
];

@injectable()
export class CurrencyService {
  /**
   * Fetch live exchange rates from open.er-api.com and upsert into DB.
   */
  async fetchLiveRates(): Promise<void> {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/INR');
      const data = await response.json() as { result: string; rates: Record<string, number> };

      if (data.result !== 'success') {
        logger.error('⏰ Currency rate API returned non-success result');
        return;
      }

      const rates = data.rates || {};
      const now = new Date();

      for (const currencyCode of SUPPORTED_CURRENCIES) {
        if (!rates[currencyCode]) continue;

        // rates[X] is the value of 1 INR in X currency
        // We need rate_to_inr = how many INR for 1 unit of X
        const rateToInr = 1 / rates[currencyCode];

        const existing = await CurrencyRate.findOne({ where: { currencyCode } });
        if (existing) {
          await existing.update({ rateToInr, fetchedAt: now, source: 'api' });
        } else {
          await CurrencyRate.create({
            currencyCode,
            rateToInr,
            fetchedAt: now,
            source: 'api',
          } as any);
        }
      }

      logger.info(`⏰ Currency rates updated for ${SUPPORTED_CURRENCIES.length} currencies`);
    } catch (error: any) {
      logger.error(`⏰ Failed to fetch currency rates: ${error.message}`);
    }
  }

  /**
   * Get all supported currencies with current rates.
   */
  async getSupportedCurrencies() {
    const rates = await CurrencyRate.findAll({
      order: [['currency_code', 'ASC']],
    });

    // Always include INR at rate 1.0
    const result = [
      { currencyCode: 'INR', rateToInr: 1, fetchedAt: new Date(), source: 'system' as const },
      ...rates.map((r) => ({
        currencyCode: r.currencyCode,
        rateToInr: Number(r.rateToInr),
        fetchedAt: r.fetchedAt,
        source: r.source,
      })),
    ];

    return result;
  }

  /**
   * Convert an amount from a given currency to INR.
   */
  async convertToINR(amount: number, currencyCode: string): Promise<{ inrAmount: number; exchangeRate: number }> {
    if (currencyCode === 'INR') {
      return { inrAmount: amount, exchangeRate: 1 };
    }

    const rate = await CurrencyRate.findOne({ where: { currencyCode } });
    if (!rate) {
      throw new Error(`Exchange rate not found for currency: ${currencyCode}`);
    }

    const exchangeRate = Number(rate.rateToInr);
    const inrAmount = Math.round(amount * exchangeRate * 100) / 100;

    return { inrAmount, exchangeRate };
  }

  /**
   * Manually set a currency rate (override API rate).
   */
  async setManualRate(currencyCode: string, rateToInr: number) {
    const existing = await CurrencyRate.findOne({ where: { currencyCode } });
    if (existing) {
      await existing.update({ rateToInr, fetchedAt: new Date(), source: 'manual' });
      return existing;
    }

    return await CurrencyRate.create({
      currencyCode,
      rateToInr,
      fetchedAt: new Date(),
      source: 'manual',
    } as any);
  }
}
