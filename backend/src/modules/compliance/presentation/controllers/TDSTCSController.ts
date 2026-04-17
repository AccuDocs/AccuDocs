import { Response } from 'express';
import { container } from 'tsyringe';
import { TDSTCSService } from '../../../compliance/application/services/TDSTCSService';
import { sendSuccess, sendCreated, sendNoContent } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class TDSTCSController {
  // ─── TDS ────────────────────────────────────────────────────────────────────

  static getSections = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const sections = service.getSections();
    sendSuccess(res, sections);
  });

  static calculateTDS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const { amount, section, isIndividual } = req.body;
    const result = service.calculateTDS(Number(amount), section, isIndividual !== false);
    sendSuccess(res, result);
  });

  static createTDS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const result = await service.createTDS(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, result, 'TDS entry created');
  });

  static listTDS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const { clientId, period, section, status } = req.query;
    const result = await service.listTDS(req.user!.organizationId, {
      clientId: clientId as string,
      period: period as string,
      section: section as string,
      status: status as string,
    });
    sendSuccess(res, result);
  });

  static updateTDS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const result = await service.updateTDS(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, result, 'TDS entry updated');
  });

  static deleteTDS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    await service.deleteTDS(req.user!.organizationId, req.params.id);
    sendNoContent(res);
  });

  // ─── TCS ────────────────────────────────────────────────────────────────────

  static createTCS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const result = await service.createTCS(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, result, 'TCS entry created');
  });

  static listTCS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const { period, sellerGstin } = req.query;
    const result = await service.listTCS(req.user!.organizationId, {
      period: period as string,
      sellerGstin: sellerGstin as string,
    });
    sendSuccess(res, result);
  });

  static updateTCS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const result = await service.updateTCS(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, result, 'TCS entry updated');
  });

  static deleteTCS = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    await service.deleteTCS(req.user!.organizationId, req.params.id);
    sendNoContent(res);
  });

  // ─── Form 26AS Summary ─────────────────────────────────────────────────────

  static getForm26ASSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TDSTCSService);
    const { financialYear } = req.query;
    const result = await service.getForm26ASSummary(
      req.user!.organizationId,
      req.params.clientId,
      financialYear as string || '2024-25'
    );
    sendSuccess(res, result);
  });
}
