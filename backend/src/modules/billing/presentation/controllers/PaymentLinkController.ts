import { Request, Response } from 'express';
import { PaymentLinkService } from '../../application/services/PaymentLinkService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const paymentLinkService = new PaymentLinkService();

export class PaymentLinkController {
  /** POST /billing/invoices/:id/payment-link — authenticated */
  static generateLink = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await paymentLinkService.generateLink(req.user!.organizationId, req.params.id);
    sendCreated(res, result, 'Payment link generated');
  });

  /** GET /public/pay/:token — no auth */
  static getPublicSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await paymentLinkService.getPublicSummary(req.params.token);
    sendSuccess(res, summary);
  });

  /** POST /public/pay/:token/confirm — no auth, manual payment confirmation */
  static markPaid = asyncHandler(async (req: Request, res: Response) => {
    const { paymentMode = 'online', referenceNumber, notes } = req.body;
    const result = await paymentLinkService.markPaidByToken(req.params.token, {
      paymentMode,
      referenceNumber,
      notes,
    });
    sendSuccess(res, result, 'Invoice marked as paid');
  });
}
