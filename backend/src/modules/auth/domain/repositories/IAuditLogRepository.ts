export interface IAuditLogRepository {
  getStats(organizationId: string, days: number): Promise<any>;
}
