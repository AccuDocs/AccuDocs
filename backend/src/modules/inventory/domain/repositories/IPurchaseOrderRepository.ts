import { PurchaseOrder } from '../entities/PurchaseOrder.entity';

export interface IPurchaseOrderRepository {
  save(po: PurchaseOrder, lineItems?: any[]): Promise<PurchaseOrder>;
  findById(id: string, orgId: string): Promise<PurchaseOrder | null>;
  findAll(orgId: string, filters: any, pagination: any): Promise<{ rows: PurchaseOrder[]; total: number }>;
  findByClient(clientId: string, orgId: string): Promise<PurchaseOrder[]>;
  generatePoNumber(orgId: string): Promise<string>;
}
