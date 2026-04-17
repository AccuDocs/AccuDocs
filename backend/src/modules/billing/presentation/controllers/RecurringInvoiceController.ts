import { Response } from 'express';
import { container } from 'tsyringe';
import { RecurringInvoiceService } from '../../application/services/RecurringInvoiceService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class RecurringInvoiceController {
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(RecurringInvoiceService);
    const result = await service.create(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, result, 'Recurring invoice created successfully');
  });

  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(RecurringInvoiceService);
    const { status } = req.query;
    const result = await service.list(req.user!.organizationId, {
      status: status as string | undefined,
    });
    sendSuccess(res, result);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(RecurringInvoiceService);
    const result = await service.getById(req.user!.organizationId, req.params.id);
    sendSuccess(res, result);
  });

  static pause = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(RecurringInvoiceService);
    const result = await service.pause(req.user!.organizationId, req.params.id);
    sendSuccess(res, result, 'Recurring invoice paused');
  });

  static resume = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(RecurringInvoiceService);
    const result = await service.resume(req.user!.organizationId, req.params.id);
    sendSuccess(res, result, 'Recurring invoice resumed');
  });
}
