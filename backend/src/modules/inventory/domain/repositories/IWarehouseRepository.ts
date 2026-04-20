import { Warehouse } from '../entities/Warehouse.entity';

export interface IWarehouseRepository {
  save(warehouse: Warehouse): Promise<Warehouse>;
  findById(id: string, orgId: string): Promise<Warehouse | null>;
  findAll(orgId: string): Promise<Warehouse[]>;
  findDefault(orgId: string): Promise<Warehouse | null>;
  delete(id: string, orgId: string): Promise<void>;
}
