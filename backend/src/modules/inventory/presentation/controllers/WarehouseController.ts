import { Response } from 'express';
import { container } from 'tsyringe';
import { WarehouseService } from '../../application/services/WarehouseService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class WarehouseController {
  static createWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const wh = await service.createWarehouse(req.user!.organizationId, req.body);
    sendCreated(res, wh, 'Warehouse created successfully');
  });

  static getWarehouses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const whs = await service.getWarehouses(req.user!.organizationId);
    sendSuccess(res, whs);
  });

  static getWarehouseById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const wh = await service.getWarehouseById(req.user!.organizationId, req.params.id);
    sendSuccess(res, wh);
  });

  static updateWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const wh = await service.updateWarehouse(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, wh, 'Warehouse updated successfully');
  });

  static deleteWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    await service.deleteWarehouse(req.user!.organizationId, req.params.id);
    sendSuccess(res, null, 'Warehouse deactivated');
  });

  static getStockSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const summary = await service.getStockSummary(req.user!.organizationId, req.params.id, req.query);
    sendSuccess(res, summary);
  });

  // ─── Client workspace: stock history for a client ─────────────────────────────

  static getClientStockHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(WarehouseService);
    const history = await service.getClientStockHistory(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, history);
  });
}
