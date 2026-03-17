import { injectable, inject } from "tsyringe";
import { IRevenueForecastRepository } from "../../domain/repositories/IRevenueForecastRepository";
import { IClientRiskScoreRepository } from "../../domain/repositories/IClientRiskScoreRepository";
import { ClientRiskScore } from "../../domain/entities/ClientRiskScore";
import { RevenueForecast } from "../../domain/entities/RevenueForecast";
import { AppError } from "../../../../utils/errors";

@injectable()
export class IntelligenceService {
  constructor(
    @inject("IRevenueForecastRepository") private forecastRepo: IRevenueForecastRepository,
    @inject("IClientRiskScoreRepository") private riskScoreRepo: IClientRiskScoreRepository
  ) {}

  async getForecastsByYear(organizationId: string, financialYear: string) {
    const forecasts = await this.forecastRepo.findAllByYear(financialYear, organizationId);
    return forecasts.map(f => ({
      id: f.id,
      clientId: f.clientId,
      expectedRevenue: f.expectedRevenue,
      realizedRevenue: f.realizedRevenue,
      confidenceScore: f.confidenceScore,
      aiPredictions: f.aiPredictions,
      updatedAt: f.updatedAt
    }));
  }

  async getClientRisk(organizationId: string, clientId: string) {
    const risk = await this.riskScoreRepo.findByClientId(clientId, organizationId);
    
    // If not calculated yet, return a default structured response rather than 404
    if (!risk) {
      return {
        clientId,
        riskScore: 0,
        factors: [],
        lastCalculated: null
      };
    }

    return {
      clientId: risk.clientId,
      riskScore: risk.riskScore,
      factors: risk.factors,
      lastCalculated: risk.lastCalculated
    };
  }

  // Stubs for future scheduled jobs
  async calculateClientRisk(organizationId: string, clientId: string) {
    // Collect data (invoices, payments, communication)
    // Send to AI Model
    // Save Result
    const riskScoreProps = {
      organizationId,
      clientId,
      riskScore: Math.floor(Math.random() * 100),
      factors: [{ factor: "Payment Delays", impact: "High" }],
      lastCalculated: new Date()
    };
    const scoreResult = ClientRiskScore.create(riskScoreProps);
    if(scoreResult.isFailure) throw new AppError(scoreResult.getError() as string, 500);
    return this.riskScoreRepo.save(scoreResult.getValue());
  }

  async calculateRevenueForecast(organizationId: string, clientId: string, financialYear: string) {
    // Generate ML based forecast
    const forecastProps = {
      organizationId,
      clientId,
      financialYear,
      expectedRevenue: 500000,
      realizedRevenue: 100000,
      confidenceScore: 85,
      aiPredictions: { trend: "upward", seasonality: "Q4 Peak" },
      updatedAt: new Date()
    };
    const forecastResult = RevenueForecast.create(forecastProps);
    if(forecastResult.isFailure) throw new AppError(forecastResult.getError() as string, 500);
    return this.forecastRepo.save(forecastResult.getValue());
  }
}
