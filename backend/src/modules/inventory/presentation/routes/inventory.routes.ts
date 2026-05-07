import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { validate } from '../../../../middlewares/validate.middleware';

import { ItemController } from '../controllers/ItemController';
import { CategoryController } from '../controllers/CategoryController';
import { WarehouseController } from '../controllers/WarehouseController';
import { StockController } from '../controllers/StockController';
import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { StockTransferController } from '../controllers/StockTransferController';

import {
  CreateItemSchema,
  UpdateItemSchema,
  CreateVariantSchema,
  SetClientPriceSchema,
  CreateWarehouseSchema,
  UpdateWarehouseSchema,
  OpeningStockSchema,
  AdjustStockSchema,
  RecordStockAdjustmentSchema,
  CreatePOSchema,
  AutoCreatePOSchema,
  ReceivePOItemsSchema,
  CreateTransferSchema,
} from '../validators/inventory.validators';

const router = Router();
router.use(authenticate, requireRole('admin', 'accountant'));

/**
 * @openapi
 * tags:
 *   name: Inventory
 *   description: Inventory management - items, categories, warehouses, stock, purchase orders, and transfers
 */

// ─── Categories (Hierarchical Tree) ───────────────────────────────────────────

/**
 * @openapi
 * /inventory/categories/tree:
 *   get:
 *     tags: [Inventory]
 *     summary: Get category tree hierarchy
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category tree retrieved
 */
router.get('/categories/tree', CategoryController.getTree);

/**
 * @openapi
 * /inventory/categories/groups:
 *   get:
 *     tags: [Inventory]
 *     summary: Get category groups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category groups retrieved
 */
router.get('/categories/groups', CategoryController.getGroups);

/**
 * @openapi
 * /inventory/categories:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post('/categories', CategoryController.createCategory);

/**
 * @openapi
 * /inventory/categories/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get category by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved
 */
router.get('/categories/:id', CategoryController.getCategoryById);

/**
 * @openapi
 * /inventory/categories/{id}/children:
 *   get:
 *     tags: [Inventory]
 *     summary: Get child categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child categories retrieved
 */
router.get('/categories/:id/children', CategoryController.getChildren);

/**
 * @openapi
 * /inventory/categories/{id}/breadcrumb:
 *   get:
 *     tags: [Inventory]
 *     summary: Get category breadcrumb path
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Breadcrumb retrieved
 */
router.get('/categories/:id/breadcrumb', CategoryController.getBreadcrumb);

/**
 * @openapi
 * /inventory/categories/{id}/descendants:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all descendants of a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Descendants retrieved
 */
router.get('/categories/:id/descendants', CategoryController.getDescendants);

/**
 * @openapi
 * /inventory/categories/{id}/item-count:
 *   get:
 *     tags: [Inventory]
 *     summary: Get item count in category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item count retrieved
 */
router.get('/categories/:id/item-count', CategoryController.getItemCount);

/**
 * @openapi
 * /inventory/categories/{id}/stock-value:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock value for a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock value retrieved
 */
router.get('/categories/:id/stock-value', CategoryController.getStockValue);

/**
 * @openapi
 * /inventory/categories/{id}:
 *   patch:
 *     tags: [Inventory]
 *     summary: Update a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.patch('/categories/:id', CategoryController.updateCategory);

/**
 * @openapi
 * /inventory/categories/{id}/move:
 *   patch:
 *     tags: [Inventory]
 *     summary: Move a category to a new parent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newParentId]
 *             properties:
 *               newParentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category moved successfully
 */
router.patch('/categories/:id/move', CategoryController.moveCategory);

/**
 * @openapi
 * /inventory/categories/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Category deleted successfully
 */
router.delete('/categories/:id', CategoryController.deleteCategory);

// ─── Items ────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/items:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a new inventory item
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item created successfully
 */
router.post('/items',                          validate(CreateItemSchema),              ItemController.createItem);

/**
 * @openapi
 * /inventory/items:
 *   get:
 *     tags: [Inventory]
 *     summary: List all inventory items with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Items retrieved
 */
router.get('/items',                                                                    ItemController.getItems);

/**
 * @openapi
 * /inventory/items/barcode/{barcode}:
 *   get:
 *     tags: [Inventory]
 *     summary: Search item by barcode
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item found
 *       404:
 *         description: Item not found
 */
router.get('/items/barcode/:barcode',                                                   ItemController.searchByBarcode);

/**
 * @openapi
 * /inventory/items/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get item by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item retrieved
 */
router.get('/items/:id',                                                                ItemController.getItemById);

/**
 * @openapi
 * /inventory/items/{id}:
 *   put:
 *     tags: [Inventory]
 *     summary: Update an item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
router.put('/items/:id',                       validate(UpdateItemSchema),              ItemController.updateItem);

/**
 * @openapi
 * /inventory/items/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete an item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Item deleted successfully
 */
router.delete('/items/:id',                                                             ItemController.deleteItem);

// ─── Item Variants ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/items/{id}/variants:
 *   get:
 *     tags: [Inventory]
 *     summary: Get variants for an item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Variants retrieved
 */
router.get('/items/:id/variants',                                                       ItemController.getVariants);

/**
 * @openapi
 * /inventory/items/{id}/variants:
 *   post:
 *     tags: [Inventory]
 *     summary: Add a variant to an item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Variant added successfully
 */
router.post('/items/:id/variants',             validate(CreateVariantSchema),           ItemController.addVariant);

/**
 * @openapi
 * /inventory/items/{id}/variants/{variantId}:
 *   put:
 *     tags: [Inventory]
 *     summary: Update an item variant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Variant updated successfully
 */
router.put('/items/:id/variants/:variantId',   validate(CreateVariantSchema.partial()), ItemController.updateVariant);

// ─── Client Pricing ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/items/{id}/client-price/{clientId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get effective price for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Effective price retrieved
 */
router.get('/items/:id/client-price/:clientId',                                         ItemController.getEffectivePrice);

/**
 * @openapi
 * /inventory/items/client-pricing:
 *   post:
 *     tags: [Inventory]
 *     summary: Set client-specific pricing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, clientId, price]
 *             properties:
 *               itemId:
 *                 type: string
 *               clientId:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Client pricing set successfully
 */
router.post('/items/client-pricing',           validate(SetClientPriceSchema),          ItemController.setClientPrice);

/**
 * @openapi
 * /inventory/client-pricing/{clientId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all client-specific pricing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client pricing retrieved
 */
router.get('/client-pricing/:clientId',                                                 ItemController.getClientPricing);
router.put('/client-pricing/:id',              validate(SetClientPriceSchema.partial()), ItemController.updateClientPrice);
router.delete('/client-pricing/:id',                                                    ItemController.deleteClientPrice);

// ─── Warehouses ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/warehouses:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a new warehouse
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 */
router.post('/warehouses',                     validate(CreateWarehouseSchema),         WarehouseController.createWarehouse);

/**
 * @openapi
 * /inventory/warehouses:
 *   get:
 *     tags: [Inventory]
 *     summary: List all warehouses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouses retrieved
 */
router.get('/warehouses',                                                               WarehouseController.getWarehouses);

/**
 * @openapi
 * /inventory/warehouses/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get warehouse by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warehouse retrieved
 */
router.get('/warehouses/:id',                                                           WarehouseController.getWarehouseById);

/**
 * @openapi
 * /inventory/warehouses/{id}:
 *   put:
 *     tags: [Inventory]
 *     summary: Update a warehouse
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 */
router.put('/warehouses/:id',                  validate(UpdateWarehouseSchema),         WarehouseController.updateWarehouse);

/**
 * @openapi
 * /inventory/warehouses/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete a warehouse
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Warehouse deleted successfully
 */
router.delete('/warehouses/:id',                                                        WarehouseController.deleteWarehouse);

/**
 * @openapi
 * /inventory/warehouses/{id}/stock-summary:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock summary for a warehouse
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock summary retrieved
 */
router.get('/warehouses/:id/stock-summary',                                             WarehouseController.getStockSummary);

// ─── Stock Ledger & Movements ─────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/stock/ledger:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock ledger
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Stock ledger retrieved
 */
router.get('/stock/ledger',                                                             StockController.getLedger);

/**
 * @openapi
 * /inventory/stock/opening:
 *   post:
 *     tags: [Inventory]
 *     summary: Set opening stock for an item/warehouse
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, warehouseId, quantity]
 *             properties:
 *               itemId:
 *                 type: string
 *               warehouseId:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unitCost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Opening stock set successfully
 */
router.post('/stock/opening',                  validate(OpeningStockSchema),            StockController.setOpeningStock);

/**
 * @openapi
 * /inventory/stock/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Adjust stock quantity
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, warehouseId, adjustment, reason]
 *             properties:
 *               itemId:
 *                 type: string
 *               warehouseId:
 *                 type: string
 *               adjustment:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
router.post('/stock/adjust',                   validate(AdjustStockSchema),             StockController.adjustStock);
router.post('/stock/adjustment',               validate(RecordStockAdjustmentSchema),    StockController.recordStockAdjustment);

/**
 * @openapi
 * /inventory/stock/valuation:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock valuation report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Valuation report retrieved
 */
router.get('/stock/valuation',                                                          StockController.getValuation);

/**
 * @openapi
 * /inventory/stock/low-stock-alerts:
 *   get:
 *     tags: [Inventory]
 *     summary: Get low stock alerts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved
 */
router.get('/stock/low-stock-alerts',                                                   StockController.getLowStockAlerts);

// ─── Client Workspace: stock movements linked to a client ─────────────────────

/**
 * @openapi
 * /inventory/stock/client-summary/{clientId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get client stock summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client stock summary retrieved
 */
router.get('/stock/client-summary/:clientId',                                           StockController.getClientSummary);
router.get('/stock/client-ledger/:clientId',                                            StockController.getClientLedger);
router.get('/stock/client-valuation/:clientId',                                         StockController.getClientValuation);

/**
 * @openapi
 * /inventory/stock/client-history/{clientId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get client stock history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client stock history retrieved
 */
router.get('/stock/client-history/:clientId',                                           WarehouseController.getClientStockHistory);

// ─── Purchase Orders ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/purchase-orders:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a new purchase order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supplierId, items]
 *             properties:
 *               supplierId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 */
router.post('/purchase-orders',                validate(CreatePOSchema),               PurchaseOrderController.createPO);

/**
 * @openapi
 * /inventory/purchase-orders:
 *   get:
 *     tags: [Inventory]
 *     summary: List all purchase orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchase orders retrieved
 */
router.get('/purchase-orders',                                                          PurchaseOrderController.getPOs);
router.post('/purchase-orders/auto-create/:clientId', validate(AutoCreatePOSchema),      PurchaseOrderController.autoCreateFromLowStock);
router.get('/purchase-orders/:id/pdf',                                                  PurchaseOrderController.generatePdf);

/**
 * @openapi
 * /inventory/purchase-orders/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get purchase order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order retrieved
 */
router.get('/purchase-orders/:id',                                                      PurchaseOrderController.getPOById);

/**
 * @openapi
 * /inventory/purchase-orders/{id}/send:
 *   patch:
 *     tags: [Inventory]
 *     summary: Send purchase order to supplier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order sent
 */
router.patch('/purchase-orders/:id/send',                                               PurchaseOrderController.sendPO);

/**
 * @openapi
 * /inventory/purchase-orders/{id}/cancel:
 *   patch:
 *     tags: [Inventory]
 *     summary: Cancel a purchase order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order cancelled
 */
router.patch('/purchase-orders/:id/cancel',                                             PurchaseOrderController.cancelPO);

/**
 * @openapi
 * /inventory/purchase-orders/{id}/receive:
 *   post:
 *     tags: [Inventory]
 *     summary: Receive items from a purchase order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receivedItems]
 *             properties:
 *               receivedItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Items received successfully
 */
router.post('/purchase-orders/:id/receive',    validate(ReceivePOItemsSchema),          PurchaseOrderController.receiveItems);

/**
 * @openapi
 * /inventory/purchase-orders/client/{clientId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get purchase orders for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client purchase orders retrieved
 */
router.get('/purchase-orders/client/:clientId',                                         PurchaseOrderController.getByClient);

// ─── Stock Transfers ──────────────────────────────────────────────────────────

/**
 * @openapi
 * /inventory/transfers:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a stock transfer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromWarehouseId, toWarehouseId, items]
 *             properties:
 *               fromWarehouseId:
 *                 type: string
 *               toWarehouseId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *     responses:
 *       201:
 *         description: Stock transfer created successfully
 */
router.post('/transfers',                      validate(CreateTransferSchema),          StockTransferController.createTransfer);

/**
 * @openapi
 * /inventory/transfers:
 *   get:
 *     tags: [Inventory]
 *     summary: List all stock transfers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock transfers retrieved
 */
router.get('/transfers',                                                                StockTransferController.getTransfers);
router.get('/transfers/client/:clientId',                                               StockTransferController.getTransfersForClient);
router.post('/transfers/client/:clientId',     validate(CreateTransferSchema),          StockTransferController.createTransferForClient);

/**
 * @openapi
 * /inventory/transfers/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock transfer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock transfer retrieved
 */
router.get('/transfers/:id',                                                            StockTransferController.getTransferById);

/**
 * @openapi
 * /inventory/transfers/{id}/dispatch:
 *   patch:
 *     tags: [Inventory]
 *     summary: Dispatch a stock transfer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer dispatched
 */
router.patch('/transfers/:id/dispatch',                                                 StockTransferController.dispatchTransfer);

/**
 * @openapi
 * /inventory/transfers/{id}/receive:
 *   patch:
 *     tags: [Inventory]
 *     summary: Receive a stock transfer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer received
 */
router.patch('/transfers/:id/receive',                                                  StockTransferController.receiveTransfer);

export default router;
