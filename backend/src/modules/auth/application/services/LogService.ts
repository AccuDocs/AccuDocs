import { injectable, inject } from "tsyringe";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";

@injectable()
export class LogService {
  constructor(
    @inject("IAuditLogRepository") private auditRepo: IAuditLogRepository
  ) {}

  async getLogStats(organizationId: string, days: number = 30) {
    return this.auditRepo.getStats(organizationId, days);
  }
}
