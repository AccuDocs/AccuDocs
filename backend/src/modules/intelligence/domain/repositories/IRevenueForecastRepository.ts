import { RevenueForecast } from "../entities/RevenueForecast";

export interface IRevenueForecastRepository {
  save(forecast: RevenueForecast, options?: any): Promise<RevenueForecast>;
  findByClientIdAndYear(clientId: string, financialYear: string, organizationId: string): Promise<RevenueForecast | null>;
  findAllByYear(financialYear: string, organizationId: string): Promise<RevenueForecast[]>;
}
