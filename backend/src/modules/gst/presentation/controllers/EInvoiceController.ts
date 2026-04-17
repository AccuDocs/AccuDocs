import { Response } from 'express';
import { container } from 'tsyringe';
import { EInvoiceService } from '../../application/services/EInvoiceService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class EInvoiceController {
  static generateIRN = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EInvoiceService);
    const result = await service.generateIRN(req.user!.organizationId, req.params.invoiceId);
    sendCreated(res, result, 'IRN generated successfully');
  });

  static cancelIRN = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EInvoiceService);
    const { reason, remarks } = req.body;
    const result = await service.cancelIRN(req.user!.organizationId, req.params.irn, reason, remarks || '');
    sendSuccess(res, result, 'IRN cancelled');
  });

  static getByInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EInvoiceService);
    const result = await service.getByInvoice(req.user!.organizationId, req.params.invoiceId);
    sendSuccess(res, result);
  });
}
