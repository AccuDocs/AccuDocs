import { injectable, inject } from "tsyringe";
import { IChecklistRepository } from "../../domain/repositories/IChecklistRepository";

@injectable()
export class ChecklistService {
  constructor(
    @inject("IChecklistRepository") private checklistRepo: IChecklistRepository
  ) {}

  async getChecklists(organizationId: string, filters: any, pagination: any) {
    return this.checklistRepo.findAll(organizationId, filters, pagination);
  }

  async getTemplates() {
    return this.checklistRepo.findTemplates();
  }

  async getStats(organizationId: string) {
    return this.checklistRepo.getStats(organizationId);
  }
}
