import { Response } from 'express';
import { container } from 'tsyringe';
import { CategoryService } from '../../application/services/CategoryService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class CategoryController {
  /**
   * GET /categories/tree
   * Get complete nested tree for organization
   */
  static getTree = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const tree = await service.getTree(req.user!.organizationId);
    sendSuccess(res, tree);
  });

  /**
   * GET /categories/groups
   * Get only top-level groups (for dropdowns)
   */
  static getGroups = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const groups = await service.getGroups(req.user!.organizationId);
    sendSuccess(res, groups);
  });

  /**
   * GET /categories/:id/children
   * Get direct children of a category
   */
  static getChildren = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const children = await service.getChildren(req.params.id, req.user!.organizationId);
    sendSuccess(res, children);
  });

  /**
   * GET /categories/:id/breadcrumb
   * Get path from root to this category
   */
  static getBreadcrumb = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const breadcrumb = await service.getBreadcrumb(req.params.id, req.user!.organizationId);
    sendSuccess(res, breadcrumb);
  });

  /**
   * GET /categories/:id/descendants
   * Get all descendants of category
   */
  static getDescendants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const descendants = await service.getDescendants(req.params.id, req.user!.organizationId);
    sendSuccess(res, descendants);
  });

  /**
   * GET /categories/:id
   * Get single category by ID
   */
  static getCategoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const category = await service.getCategoryById(req.params.id, req.user!.organizationId);
    sendSuccess(res, category);
  });

  /**
   * POST /categories
   * Create new category
   */
  static createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const { name, parent_id, description, is_active } = req.body;

    const category = await service.createCategory(req.user!.organizationId, {
      name,
      parent_id,
      description,
      is_active,
    });

    sendCreated(res, category, 'Category created successfully');
  });

  /**
   * PATCH /categories/:id
   * Update category
   */
  static updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const category = await service.updateCategory(req.params.id, req.user!.organizationId, req.body);
    sendSuccess(res, category, 'Category updated successfully');
  });

  /**
   * PATCH /categories/:id/move
   * Move category to different parent
   */
  static moveCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const { parent_id } = req.body;
    const category = await service.moveCategory(req.params.id, req.user!.organizationId, parent_id);
    sendSuccess(res, category, 'Category moved successfully');
  });

  /**
   * DELETE /categories/:id
   * Delete category (only if no children or items)
   */
  static deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    await service.deleteCategory(req.params.id, req.user!.organizationId);
    sendSuccess(res, null, 'Category deleted successfully');
  });

  /**
   * GET /categories/:id/item-count
   * Get count of items in category and descendants
   */
  static getItemCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const count = await service.getItemCount(req.params.id, req.user!.organizationId);
    sendSuccess(res, { count });
  });

  /**
   * GET /categories/:id/stock-value
   * Get total stock value for category and descendants
   */
  static getStockValue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CategoryService);
    const stockValue = await service.getStockValue(req.params.id, req.user!.organizationId);
    sendSuccess(res, { stock_value: stockValue });
  });
}
