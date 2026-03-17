import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { IntelligenceService } from '../../application/services/IntelligenceService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class IntelligenceController {
  
  static getForecasts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(IntelligenceService);
    // Assuming yearId param passed is of format 'FY23-24'
    const forecasts = await service.getForecastsByYear(req.user!.organizationId, req.params.yearId);
    sendSuccess(res, forecasts);
  });

  static getClientRisk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(IntelligenceService);
    const riskData = await service.getClientRisk(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, riskData);
  });
}
