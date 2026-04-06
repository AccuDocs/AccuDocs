export interface IChecklistRepository {
  findAll(organizationId: string, filters: any, pagination: any): Promise<{ checklists: any[], total: number }>;
  findTemplates(): Promise<any[]>;
  getStats(organizationId: string): Promise<any>;
  findTemplateById(id: string): Promise<any | null>;
  create(checklist: any): Promise<void>;
}
