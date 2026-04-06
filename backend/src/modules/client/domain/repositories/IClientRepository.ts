import { Client } from "../entities/Client";

export interface IClientRepository {
  save(client: Client, options?: any): Promise<void>;
  findById(id: string, organizationId?: string): Promise<Client | null>;
  findByCode(code: string, organizationId: string): Promise<Client | null>;
  findByUserId(userId: string, organizationId?: string): Promise<Client | null>;
  existsByCode(code: string, organizationId: string, excludeId?: string): Promise<boolean>;
  getNextCode(organizationId: string): Promise<string>;
  delete(id: string, organizationId: string, options?: any): Promise<void>;
  findAll(filters: { search?: string; organizationId?: string }, pagination: any): Promise<{ clients: any[]; total: number }>;
}
