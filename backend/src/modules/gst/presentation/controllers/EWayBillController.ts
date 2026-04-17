import { Response } from 'express';
import { container } from 'tsyringe';
import { EWayBillService } from '../../application/services/EWayBillService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class EWayBillController {
  static generate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EWayBillService);
    const { invoiceId, transporterId, vehicleNo, distanceKm, transportMode } = req.body;
    const result = await service.generateEWayBill(req.user!.organizationId, invoiceId, {
      transporterId,
      vehicleNo,
      distanceKm: Number(distanceKm),
      transportMode,
    });
    sendCreated(res, result, 'E-way bill generated successfully');
  });

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EWayBillService);
    const { reason } = req.body;
    const result = await service.cancelEWayBill(req.user!.organizationId, req.params.no, reason);
    sendSuccess(res, result, 'E-way bill cancelled');
  });

  static updateVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EWayBillService);
    const { vehicleNo } = req.body;
    const result = await service.updateVehicle(req.user!.organizationId, req.params.no, vehicleNo);
    sendSuccess(res, result, 'Vehicle number updated');
  });

  static getByInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EWayBillService);
    const result = await service.getByInvoice(req.user!.organizationId, req.params.invoiceId);
    sendSuccess(res, result);
  });

  static checkRequired = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(EWayBillService);
    const required = await service.shouldPromptEWayBill(req.params.invoiceId, req.user!.organizationId);
    sendSuccess(res, { required });
  });
}
