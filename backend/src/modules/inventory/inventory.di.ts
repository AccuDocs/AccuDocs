/**
 * Inventory module DI registration.
 * Import this file in the main DI bootstrap (app.ts or server.ts).
 */
import 'reflect-metadata';
import { container } from 'tsyringe';

import { SequelizeItemRepository }           from './infrastructure/repositories/SequelizeItemRepository';
import { SequelizeWarehouseRepository }      from './infrastructure/repositories/SequelizeWarehouseRepository';
import { SequelizeStockLedgerRepository }    from './infrastructure/repositories/SequelizeStockLedgerRepository';
import { SequelizePurchaseOrderRepository }  from './infrastructure/repositories/SequelizePurchaseOrderRepository';
import { SequelizeStockTransferRepository }  from './infrastructure/repositories/SequelizeStockTransferRepository';
import { SequelizeClientItemPricingRepository } from './infrastructure/repositories/SequelizeClientItemPricingRepository';

import { ItemService }           from './application/services/ItemService';
import { CategoryService } from './application/services/CategoryService';
import { WarehouseService }      from './application/services/WarehouseService';
import { StockService }          from './application/services/StockService';
import { PurchaseOrderService }  from './application/services/PurchaseOrderService';
import { StockTransferService }  from './application/services/StockTransferService';

export function registerInventoryDependencies(): void {
  // Repository bindings
  container.registerSingleton('IItemRepository',              SequelizeItemRepository);
  container.registerSingleton('IWarehouseRepository',         SequelizeWarehouseRepository);
  container.registerSingleton('IStockLedgerRepository',       SequelizeStockLedgerRepository);
  container.registerSingleton('IPurchaseOrderRepository',     SequelizePurchaseOrderRepository);
  container.registerSingleton('IStockTransferRepository',     SequelizeStockTransferRepository);
  container.registerSingleton('IClientItemPricingRepository', SequelizeClientItemPricingRepository);

  // Service bindings (injectable, but tsyringe resolves them automatically via @injectable)
  container.registerSingleton(ItemService);
  container.registerSingleton(CategoryService);
  container.registerSingleton(WarehouseService);
  container.registerSingleton(StockService);
  container.registerSingleton(PurchaseOrderService);
  container.registerSingleton(StockTransferService);
}
