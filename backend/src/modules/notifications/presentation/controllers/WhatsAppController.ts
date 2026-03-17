import { Response } from 'express';
import { container } from 'tsyringe';
import { WhatsAppService } from '../../application/services/WhatsAppService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class WhatsAppController {
  
  static getQR = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.getQR();
    sendSuccess(res, result);
  });

  static getStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.getStatus();
    sendSuccess(res, result);
  });

  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.logout();
    sendSuccess(res, result);
  });
}
