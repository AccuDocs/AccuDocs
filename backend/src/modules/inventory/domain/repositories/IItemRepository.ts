import { Item } from '../entities/Item.entity';

export interface IItemRepository {
  save(item: Item): Promise<Item>;
  findById(id: string, orgId: string): Promise<Item | null>;
  findBySku(sku: string, orgId: string): Promise<Item | null>;
  findByBarcode(barcode: string, orgId: string): Promise<Item | null>;
  findAll(orgId: string, filters: any, pagination: any): Promise<{ items: Item[]; total: number }>;
  delete(id: string, orgId: string): Promise<void>;
}
