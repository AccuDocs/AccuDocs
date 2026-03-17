import { injectable, inject } from "tsyringe";
import { IComplianceRepository } from "../../domain/repositories/IComplianceRepository";

@injectable()
export class ComplianceService {
  constructor(
    @inject("IComplianceRepository") private complianceRepo: IComplianceRepository
  ) {}

  async getUpcomingDeadlines(limit: number = 5) {
    return this.complianceRepo.findUpcoming(limit);
  }

  async getDeadlines(filters: any) {
    return this.complianceRepo.findAll(filters);
  }

  async getStats() {
    return this.complianceRepo.getStats();
  }
}
