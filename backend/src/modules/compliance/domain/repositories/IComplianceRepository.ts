export interface IComplianceRepository {
  findUpcoming(limit: number): Promise<any[]>;
  findAll(filters: any): Promise<any[]>;
  getStats(): Promise<any>;
}
