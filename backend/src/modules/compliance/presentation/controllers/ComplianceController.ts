import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ComplianceService } from '../../application/services/ComplianceService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class ComplianceController {
  
  static getUpcoming = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ComplianceService);
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const deadlines = await service.getUpcomingDeadlines(limit);
    sendSuccess(res, deadlines);
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ComplianceService);
    const stats = await service.getStats();
    sendSuccess(res, stats);
  });
}
