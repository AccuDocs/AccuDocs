import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { NotificationService } from '../../application/services/NotificationService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class NotificationController {
  
  static getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(NotificationService);
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await service.getUserNotifications(req.user!.organizationId, req.user!.userId, unreadOnly);
    sendSuccess(res, notifications);
  });

  static markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(NotificationService);
    const result = await service.markAsRead(req.user!.organizationId, req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Notification marked as read');
  });

  static markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(NotificationService);
    const result = await service.markAllAsRead(req.user!.organizationId, req.user!.userId);
    sendSuccess(res, result, 'All notifications marked as read');
  });
}
