import { Response } from 'express';
import { container } from 'tsyringe';
import { ItemService } from '../../application/services/ItemService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class ItemController {
  // ─── Items CRUD ──────────────────────────────────────────────────────────────

  static createItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const item = await service.createItem(req.user!.organizationId, req.body);
    sendCreated(res, item, 'Item created successfully');
  });

  static getItems = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const { page = 1, limit = 20, search, itemType, categoryId, isActive } = req.query;
    const { items, total } = await service.getItems(
      req.user!.organizationId,
      { search, itemType, categoryId, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined },
      { page: Number(page), limit: Number(limit) },
    );
    sendPaginated(res, items, Number(page), Number(limit), total);
  });

  static getItemById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const item = await service.getItemById(req.user!.organizationId, req.params.id);
    sendSuccess(res, item);
  });

  static updateItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const item = await service.updateItem(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, item, 'Item updated successfully');
  });

  static deleteItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    await service.deleteItem(req.user!.organizationId, req.params.id);
    sendSuccess(res, null, 'Item deactivated successfully');
  });

  static searchByBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const result = await service.searchByBarcode(req.user!.organizationId, req.params.barcode);
    sendSuccess(res, result);
  });

  // ─── Variants ─────────────────────────────────────────────────────────────────

  static getVariants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const variants = await service.getVariants(req.user!.organizationId, req.params.id);
    sendSuccess(res, variants);
  });

  static addVariant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const variant = await service.addVariant(req.user!.organizationId, req.params.id, req.body);
    sendCreated(res, variant, 'Variant added successfully');
  });

  static updateVariant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const variant = await service.updateVariant(
      req.user!.organizationId,
      req.params.id,
      req.params.variantId,
      req.body,
    );
    sendSuccess(res, variant, 'Variant updated successfully');
  });

  // ─── Client Pricing ──────────────────────────────────────────────────────────

  static getEffectivePrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const price = await service.getEffectivePriceForClient(
      req.user!.organizationId,
      req.params.id,
      req.params.clientId,
    );
    sendSuccess(res, { effectivePrice: price });
  });

  static setClientPrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const pricing = await service.setClientPrice(
      req.user!.organizationId,
      req.body.clientId,
      req.body.itemId,
      req.body,
    );
    sendCreated(res, pricing, 'Client pricing set successfully');
  });

  static getClientPricing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const list = await service.getClientPricingList(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, list);
  });

  static updateClientPrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    const pricing = await service.updateClientPrice(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, pricing, 'Client pricing updated');
  });

  static deleteClientPrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ItemService);
    await service.deleteClientPrice(req.user!.organizationId, req.params.id);
    sendSuccess(res, null, 'Client pricing deleted');
  });
}
