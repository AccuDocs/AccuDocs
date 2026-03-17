import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { LogService } from '../../application/services/LogService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class LogController {
  
  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(LogService);
    const days = req.query.days ? Number(req.query.days) : 30;
    const stats = await service.getLogStats(req.user!.organizationId, days);
    sendSuccess(res, stats);
  });
}
