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
    const deadlines = await service.getUpcomingDeadlines(req.user!.organizationId, limit);
    sendSuccess(res, deadlines);
  });

  static getDeadlines = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ComplianceService);
    const deadlines = await service.getDeadlines(req.user!.organizationId, req.query);
    sendSuccess(res, deadlines);
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ComplianceService);
    const stats = await service.getStats(req.user!.organizationId);
    sendSuccess(res, stats);
  });

  static createDeadline = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ComplianceService);
    const deadline = await service.createDeadline(req.body);
    sendSuccess(res, deadline, 'Compliance deadline created successfully', 201);
  });
}
