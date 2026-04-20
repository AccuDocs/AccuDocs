export interface IStockTransferRepository {
  save(transfer: any, lineItems?: any[]): Promise<any>;
  findById(id: string, orgId: string): Promise<any | null>;
  findAll(orgId: string, filters: any): Promise<{ rows: any[]; total: number }>;
  generateTransferNumber(orgId: string): Promise<string>;
}
