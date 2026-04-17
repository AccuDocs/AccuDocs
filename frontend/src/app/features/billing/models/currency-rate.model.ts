export interface CurrencyRate {
  currencyCode: string;
  rateToInr: number;
  fetchedAt: string;
  source: 'api' | 'manual' | 'system';
}
