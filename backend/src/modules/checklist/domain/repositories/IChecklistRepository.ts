export interface IChecklistRepository {
  findAll(organizationId: string, filters: any, pagination: any): Promise<{ checklists: any[], total: number }>;
  findTemplates(): Promise<any[]>;
  getStats(organizationId: string): Promise<any>;
}
