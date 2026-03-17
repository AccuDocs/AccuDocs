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

  async getStats() {
    return this.complianceRepo.getStats();
  }
}
