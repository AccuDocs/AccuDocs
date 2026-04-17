import { Response } from 'express';
import { container } from 'tsyringe';
import { GSTR9Service } from '../../application/services/GSTR9Service';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class GSTR9Controller {
  static generate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(GSTR9Service);
    const { clientId, financialYear } = req.body;
    const result = await service.generate(req.user!.organizationId, clientId, financialYear);
    sendCreated(res, result, 'GSTR-9 generated successfully');
  });

  static download = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(GSTR9Service);
    const { clientId, financialYear } = req.query;
    const result = await service.generate(
      req.user!.organizationId,
      clientId as string,
      financialYear as string || '2024-25'
    );

    // Return as JSON (PDF generation can be added with pdf.service)
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=GSTR9_${financialYear}.json`);
    res.json(result);
  });
}
