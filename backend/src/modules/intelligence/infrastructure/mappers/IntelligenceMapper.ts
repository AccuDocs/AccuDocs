import { RevenueForecast } from "../../domain/entities/RevenueForecast";
import { ClientRiskScore } from "../../domain/entities/ClientRiskScore";

export class IntelligenceMapper {
  public static toForecastDomain(raw: any): RevenueForecast {
    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      financialYear: raw.financialYear,
      expectedRevenue: typeof raw.expectedRevenue === 'string' ? parseFloat(raw.expectedRevenue) : raw.expectedRevenue,
      realizedRevenue: typeof raw.realizedRevenue === 'string' ? parseFloat(raw.realizedRevenue) : raw.realizedRevenue,
      confidenceScore: raw.confidenceScore,
      aiPredictions: raw.aiPredictions,
      updatedAt: raw.updatedAt
    };
    return RevenueForecast.create(props, raw.id).getValue();
  }

  public static toForecastPersistence(forecast: RevenueForecast): any {
    return {
      id: forecast.id,
      organizationId: forecast.organizationId,
      clientId: forecast.clientId,
      financialYear: forecast.financialYear,
      expectedRevenue: forecast.expectedRevenue,
      realizedRevenue: forecast.realizedRevenue,
      confidenceScore: forecast.confidenceScore,
      aiPredictions: forecast.aiPredictions
    };
  }

  public static toRiskScoreDomain(raw: any): ClientRiskScore {
    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      riskScore: raw.riskScore,
      factors: raw.factors || [],
      lastCalculated: raw.lastCalculated || raw.updatedAt
    };
    return ClientRiskScore.create(props, raw.id).getValue();
  }

  public static toRiskScorePersistence(score: ClientRiskScore): any {
    return {
      id: score.id,
      organizationId: score.organizationId,
      clientId: score.clientId,
      riskScore: score.riskScore,
      factors: score.factors,
      lastCalculated: score.lastCalculated || new Date()
    };
  }
}
