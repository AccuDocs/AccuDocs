import { Response } from 'express';
import { container } from 'tsyringe';
import { StockService } from '../../application/services/StockService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const stockMovementToDto = (movement: any) => ({
  id: movement.id,
  ...(movement.props ?? {}),
  item: movement._item ?? null,
  warehouse: movement._warehouse ?? null,
  client: movement._client ?? null,
});

export class StockController {
  // ─── Ledger ───────────────────────────────────────────────────────────────────

  static getLedger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await service.getLedger(req.user!.organizationId, filters, { page, limit });
    sendPaginated(res, result.rows.map(stockMovementToDto), Number(page), Number(limit), result.total);
  });

  // ─── Opening Stock ────────────────────────────────────────────────────────────

  static setOpeningStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const movement = await service.setOpeningStock({
      ...req.body,
      orgId: req.user!.organizationId,
      createdBy: req.user!.userId,
    });
    sendCreated(res, stockMovementToDto(movement), 'Opening stock recorded');
  });

  // ─── Manual Adjustment ────────────────────────────────────────────────────────

  static adjustStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const movement = await service.adjustStock({
      ...req.body,
      orgId: req.user!.organizationId,
      createdBy: req.user!.userId,
    });
    sendCreated(res, stockMovementToDto(movement), 'Stock adjusted');
  });

  static recordStockAdjustment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const movement = await service.adjustStock({
      ...req.body,
      orgId: req.user!.organizationId,
      createdBy: req.user!.userId,
    });
    sendCreated(res, stockMovementToDto(movement), 'Stock adjustment recorded');
  });

  // ─── Valuation Report ─────────────────────────────────────────────────────────

  static getValuation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const result = await service.getStockValuation(req.user!.organizationId, req.query.warehouseId as string);
    sendSuccess(res, result);
  });

  // ─── Low Stock Alerts ─────────────────────────────────────────────────────────

  static getLowStockAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const alerts = await service.getLowStockItems(req.user!.organizationId);
    sendSuccess(res, alerts);
  });

  // ─── Client workspace: aggregate stock movements for a client ─────────────────

  static getClientSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const summary = await service.getClientStockSummary(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, summary);
  });

  static getClientLedger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const { page = 1, limit = 20, ...filters } = req.query;
    const result = await service.getClientStockLedger(
      req.user!.organizationId,
      req.params.clientId,
      filters,
      { page, limit },
    );
    sendPaginated(res, result.rows.map(stockMovementToDto), Number(page), Number(limit), result.total);
  });

  static getClientValuation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(StockService);
    const valuation = await service.getClientStockValuation(
      req.user!.organizationId,
      req.params.clientId,
      req.query,
    );
    sendSuccess(res, valuation);
  });
}
