import { injectable } from "tsyringe";
import { IRevenueForecastRepository } from "../../domain/repositories/IRevenueForecastRepository";
import { RevenueForecast } from "../../domain/entities/RevenueForecast";
import { RevenueForecast as RevenueForecastModel } from "../../../../models";
import { IntelligenceMapper } from "../mappers/IntelligenceMapper";

@injectable()
export class SequelizeRevenueForecastRepository implements IRevenueForecastRepository {
  async save(forecast: RevenueForecast, options?: any): Promise<RevenueForecast> {
    const raw = IntelligenceMapper.toForecastPersistence(forecast);
    const exists = await RevenueForecastModel.findByPk(forecast.id, { transaction: options?.transaction });

    if (exists) {
      await exists.update(raw, options);
    } else {
      await RevenueForecastModel.create(raw, options);
    }

    const saved = await RevenueForecastModel.findByPk(forecast.id, { transaction: options?.transaction });
    return IntelligenceMapper.toForecastDomain(saved);
  }

  async findByClientIdAndYear(clientId: string, financialYear: string, organizationId: string): Promise<RevenueForecast | null> {
    const forecast = await RevenueForecastModel.findOne({
      where: { clientId, financialYear, organizationId }
    });
    if (!forecast) return null;
    return IntelligenceMapper.toForecastDomain(forecast);
  }

  async findAllByYear(financialYear: string, organizationId: string): Promise<RevenueForecast[]> {
    const forecasts = await RevenueForecastModel.findAll({
      where: { financialYear, organizationId }
    });
    return forecasts.map(IntelligenceMapper.toForecastDomain);
  }
}
