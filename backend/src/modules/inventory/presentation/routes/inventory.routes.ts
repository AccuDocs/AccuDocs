import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
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
  CreatePOSchema,
  ReceivePOItemsSchema,
  CreateTransferSchema,
} from '../validators/inventory.validators';

const router = Router();
router.use(authenticate);

// ─── Categories (Hierarchical Tree) ───────────────────────────────────────────
router.get('/categories/tree', CategoryController.getTree);
router.get('/categories/groups', CategoryController.getGroups);
router.post('/categories', CategoryController.createCategory);
router.get('/categories/:id', CategoryController.getCategoryById);
router.get('/categories/:id/children', CategoryController.getChildren);
router.get('/categories/:id/breadcrumb', CategoryController.getBreadcrumb);
router.get('/categories/:id/descendants', CategoryController.getDescendants);
router.get('/categories/:id/item-count', CategoryController.getItemCount);
router.get('/categories/:id/stock-value', CategoryController.getStockValue);
router.patch('/categories/:id', CategoryController.updateCategory);
router.patch('/categories/:id/move', CategoryController.moveCategory);
router.delete('/categories/:id', CategoryController.deleteCategory);

// ─── Items ────────────────────────────────────────────────────────────────────
router.post('/items',                          validate(CreateItemSchema),              ItemController.createItem);
router.get('/items',                                                                    ItemController.getItems);
router.get('/items/barcode/:barcode',                                                   ItemController.searchByBarcode);
router.get('/items/:id',                                                                ItemController.getItemById);
router.put('/items/:id',                       validate(UpdateItemSchema),              ItemController.updateItem);
router.delete('/items/:id',                                                             ItemController.deleteItem);

// ─── Item Variants ────────────────────────────────────────────────────────────
router.get('/items/:id/variants',                                                       ItemController.getVariants);
router.post('/items/:id/variants',             validate(CreateVariantSchema),           ItemController.addVariant);
router.put('/items/:id/variants/:variantId',   validate(CreateVariantSchema.partial()), ItemController.updateVariant);

// ─── Client Pricing ───────────────────────────────────────────────────────────
router.get('/items/:id/client-price/:clientId',                                         ItemController.getEffectivePrice);
router.post('/items/client-pricing',           validate(SetClientPriceSchema),          ItemController.setClientPrice);
router.get('/client-pricing/:clientId',                                                 ItemController.getClientPricing);

// ─── Warehouses ───────────────────────────────────────────────────────────────
router.post('/warehouses',                     validate(CreateWarehouseSchema),         WarehouseController.createWarehouse);
router.get('/warehouses',                                                               WarehouseController.getWarehouses);
router.get('/warehouses/:id',                                                           WarehouseController.getWarehouseById);
router.put('/warehouses/:id',                  validate(UpdateWarehouseSchema),         WarehouseController.updateWarehouse);
router.delete('/warehouses/:id',                                                        WarehouseController.deleteWarehouse);
router.get('/warehouses/:id/stock-summary',                                             WarehouseController.getStockSummary);

// ─── Stock Ledger & Movements ─────────────────────────────────────────────────
router.get('/stock/ledger',                                                             StockController.getLedger);
router.post('/stock/opening',                  validate(OpeningStockSchema),            StockController.setOpeningStock);
router.post('/stock/adjust',                   validate(AdjustStockSchema),             StockController.adjustStock);
router.get('/stock/valuation',                                                          StockController.getValuation);
router.get('/stock/low-stock-alerts',                                                   StockController.getLowStockAlerts);

// ─── Client Workspace: stock movements linked to a client ─────────────────────
router.get('/stock/client-summary/:clientId',                                           StockController.getClientSummary);
router.get('/stock/client-history/:clientId',                                           WarehouseController.getClientStockHistory);

// ─── Purchase Orders ──────────────────────────────────────────────────────────
router.post('/purchase-orders',                validate(CreatePOSchema),               PurchaseOrderController.createPO);
router.get('/purchase-orders',                                                          PurchaseOrderController.getPOs);
router.get('/purchase-orders/:id',                                                      PurchaseOrderController.getPOById);
router.patch('/purchase-orders/:id/send',                                               PurchaseOrderController.sendPO);
router.patch('/purchase-orders/:id/cancel',                                             PurchaseOrderController.cancelPO);
router.post('/purchase-orders/:id/receive',    validate(ReceivePOItemsSchema),          PurchaseOrderController.receiveItems);
router.get('/purchase-orders/client/:clientId',                                         PurchaseOrderController.getByClient);

// ─── Stock Transfers ──────────────────────────────────────────────────────────
router.post('/transfers',                      validate(CreateTransferSchema),          StockTransferController.createTransfer);
router.get('/transfers',                                                                StockTransferController.getTransfers);
router.get('/transfers/:id',                                                            StockTransferController.getTransferById);
router.patch('/transfers/:id/dispatch',                                                 StockTransferController.dispatchTransfer);
router.patch('/transfers/:id/receive',                                                  StockTransferController.receiveTransfer);

export default router;
