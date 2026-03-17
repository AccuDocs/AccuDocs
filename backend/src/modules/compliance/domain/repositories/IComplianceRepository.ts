export interface IComplianceRepository {
  findUpcoming(limit: number): Promise<any[]>;
  getStats(): Promise<any>;
}
