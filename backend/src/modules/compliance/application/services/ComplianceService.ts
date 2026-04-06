import { injectable, inject } from "tsyringe";
import { IComplianceRepository } from "../../domain/repositories/IComplianceRepository";

@injectable()
export class ComplianceService {
  constructor(
    @inject("IComplianceRepository") private complianceRepo: IComplianceRepository
  ) {}

  async getUpcomingDeadlines(organizationId: string, limit: number = 5) {
    return this.complianceRepo.findUpcoming(organizationId, limit);
  }

  async getDeadlines(organizationId: string, filters: any) {
    return this.complianceRepo.findAll(organizationId, filters);
  }

  async getStats(organizationId: string) {
    return this.complianceRepo.getStats(organizationId);
  }

  async createDeadline(data: any) {
    return this.complianceRepo.create(data);
  }
}
