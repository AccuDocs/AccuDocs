import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ChecklistService } from '../../application/services/ChecklistService';
import { sendSuccess, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class ChecklistController {
  
  static getChecklists = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ChecklistService);
    const { page = 1, limit = 20 } = req.query;
    const { checklists, total } = await service.getChecklists(
      req.user!.organizationId,
      req.query,
      { page: Number(page), limit: Number(limit) }
    );
    sendPaginated(res, checklists, Number(page), Number(limit), total);
  });

  static getTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ChecklistService);
    const templates = await service.getTemplates();
    sendSuccess(res, templates);
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ChecklistService);
    const stats = await service.getStats(req.user!.organizationId);
    sendSuccess(res, stats);
  });

  static bulkCreate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ChecklistService);
    const result = await service.bulkCreateChecklists(
      req.user!.organizationId,
      req.user!.userId,
      req.body
    );
    sendSuccess(res, result, 'Checklists created successfully');
  });
}
