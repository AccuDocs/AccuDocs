import { Response } from 'express';
import { ITCService } from '../../application/services/ITCService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const itcService = new ITCService();

export class ITCController {
  /** GET /gst/itc/:clientId?period=YYYY-MM */
  static getLedger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId } = req.params;
    const period = req.query.period as string | undefined;

    const records = await itcService.getITCLedger(req.user!.organizationId, clientId, period);
    sendSuccess(res, records);
  });

  /** POST /gst/itc/:clientId/calculate */
  static calculate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId } = req.params;
    const { period } = req.body;

    if (!period) {
      res.status(400).json({ success: false, message: 'period (YYYY-MM) is required' });
      return;
    }

    const result = await itcService.calculateEligibleITC(req.user!.organizationId, clientId, period);
    sendSuccess(res, result, 'ITC calculated successfully');
  });
}
