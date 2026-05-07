import { Response } from 'express';
import { container } from 'tsyringe';
import { PurchaseOrderService } from '../../application/services/PurchaseOrderService';
import { StockService } from '../../application/services/StockService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class PurchaseOrderController {
  static createPO = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const po = await service.createPO(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, po, 'Purchase Order created');
  });

  static getPOs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const { page = 1, limit = 20, status, clientId: supplierClientId } = req.query;
    const { rows, total } = await service.getPOs(
      req.user!.organizationId,
      { status, supplierClientId },
      { page: Number(page), limit: Number(limit) },
    );
    sendPaginated(res, rows, Number(page), Number(limit), total);
  });

  static getPOById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const po = await service.getPOById(req.user!.organizationId, req.params.id);
    sendSuccess(res, po);
  });

  static sendPO = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const po = await service.sendPO(req.user!.organizationId, req.params.id);
    sendSuccess(res, po, 'Purchase Order sent');
  });

  static cancelPO = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const po = await service.cancelPO(req.user!.organizationId, req.params.id);
    sendSuccess(res, po, 'Purchase Order cancelled');
  });

  static receiveItems = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const poService    = container.resolve(PurchaseOrderService);
    const stockService = container.resolve(StockService);
    const po = await poService.receiveItems(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId,
      req.body.receivedItems,
      stockService,
    );
    sendSuccess(res, po, 'Items received and stock updated');
  });

  static generatePdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const pdf = await service.generatePdf(req.user!.organizationId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.send(pdf.buffer);
  });

  static autoCreateFromLowStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const poService = container.resolve(PurchaseOrderService);
    const stockService = container.resolve(StockService);
    const alerts = req.body.alerts ?? await stockService.getLowStockItems(req.user!.organizationId);
    const po = await poService.generateFromReorder(
      req.user!.organizationId,
      req.user!.userId,
      req.body.warehouseId,
      req.params.clientId,
      alerts,
    );
    sendCreated(res, po, 'Draft purchase order generated from low-stock alerts');
  });

  // ─── Client workspace: POs for a supplier client ─────────────────────────────

  static getByClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(PurchaseOrderService);
    const pos = await service.getByClient(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, pos);
  });
}
