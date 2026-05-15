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

  static sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const { to, message } = req.body;
    const result = await service.sendMessage(to, message);
    sendSuccess(res, result, 'WhatsApp message sent');
  });

  static getSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.getSession(req.params.mobile);
    sendSuccess(res, result, 'WhatsApp session retrieved');
  });

  static clearSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.clearSession();
    sendSuccess(res, result, 'WhatsApp session cleared');
  });

  static getChats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.getChats(req.user!.organizationId);
    sendSuccess(res, result, 'WhatsApp chats retrieved');
  });

  static getChatMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const result = await service.getChatMessages(req.params.chatId, limit);
    sendSuccess(res, result, 'WhatsApp messages retrieved');
  });

  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WhatsAppService);
    const result = await service.logout();
    sendSuccess(res, result);
  });
}
