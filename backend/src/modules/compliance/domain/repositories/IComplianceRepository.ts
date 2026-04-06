export interface IComplianceRepository {
  findUpcoming(organizationId: string, limit: number): Promise<any[]>;
  findAll(organizationId: string, filters: any): Promise<any[]>;
  getStats(organizationId: string): Promise<any>;
  create(data: any): Promise<any>;
}
