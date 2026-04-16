import { Response } from 'express';
import { GSTR2AReconciliationService } from '../../application/services/GSTR2AReconciliationService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const reconcileService = new GSTR2AReconciliationService();

export class GSTR2AController {
  /**
   * POST /gst/gstr2a/reconcile
   * Body: { clientId, period, gstr2aData: [...] }
   */
  static reconcile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId, period, gstr2aData } = req.body;

    if (!clientId || !period || !Array.isArray(gstr2aData)) {
      res.status(400).json({
        success: false,
        message: 'clientId, period, and gstr2aData (array) are required',
      });
      return;
    }

    const result = await reconcileService.reconcile(
      req.user!.organizationId,
      clientId,
      period,
      gstr2aData,
      req.user!.userId
    );

    sendSuccess(res, result, 'Reconciliation completed');
  });

  /**
   * GET /gst/gstr2a/reconciliation/:clientId?period=YYYY-MM
   */
  static getReconciliation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId } = req.params;
    const period = req.query.period as string | undefined;

    const records = await reconcileService.getReconciliation(
      req.user!.organizationId,
      clientId,
      period
    );

    sendSuccess(res, records);
  });
}
