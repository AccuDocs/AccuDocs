import { Response } from 'express';
import { container } from 'tsyringe';
import { StockTransferService } from '../../application/services/StockTransferService';
import { StockService } from '../../application/services/StockService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class StockTransferController {
  static createTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockTransferService);
    const transfer = await service.createTransfer(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, transfer, 'Transfer created');
  });

  static getTransfers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockTransferService);
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await service.getTransfers(req.user!.organizationId, { ...filters, page, limit });
    sendPaginated(res, result.rows, Number(page), Number(limit), result.total);
  });

  static getTransfersForClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockTransferService);
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await service.getTransfers(
      req.user!.organizationId,
      { ...filters, clientId: req.params.clientId, page, limit },
    );
    sendPaginated(res, result.rows, Number(page), Number(limit), result.total);
  });

  static createTransferForClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockTransferService);
    const transfer = await service.createTransfer(
      req.user!.organizationId,
      req.user!.userId,
      { ...req.body, clientId: req.params.clientId },
    );
    sendCreated(res, transfer, 'Client transfer created');
  });

  static getTransferById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockTransferService);
    const transfer = await service.getTransferById(req.user!.organizationId, req.params.id);
    sendSuccess(res, transfer);
  });

  static dispatchTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transferService = container.resolve(StockTransferService);
    const stockService    = container.resolve(StockService);
    const transfer = await transferService.dispatchTransfer(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId,
      stockService,
    );
    sendSuccess(res, transfer, 'Transfer dispatched — stock deducted from source');
  });

  static receiveTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transferService = container.resolve(StockTransferService);
    const stockService    = container.resolve(StockService);
    const transfer = await transferService.receiveTransfer(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId,
      stockService,
      req.body.receivedQtys,
    );
    sendSuccess(res, transfer, 'Transfer received — stock added to destination');
  });
}
