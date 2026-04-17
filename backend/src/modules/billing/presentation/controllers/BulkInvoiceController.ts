import { Response } from 'express';
import { container } from 'tsyringe';
import { BulkInvoiceService } from '../../application/services/BulkInvoiceService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class BulkInvoiceController {
  static createJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BulkInvoiceService);
    const result = await service.createJob(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, result, 'Bulk invoice job created');
  });

  static getJobStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BulkInvoiceService);
    const result = await service.getJobStatus(req.user!.organizationId, req.params.jobId);
    sendSuccess(res, result);
  });
}
