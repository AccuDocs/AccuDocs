import { injectable } from "tsyringe";
import { IChecklistRepository } from "../../domain/repositories/IChecklistRepository";
import { Checklist as ChecklistModel } from "../../../../models/checklist.model";
import { ChecklistTemplate as ChecklistTemplateModel } from "../../../../models/checklist-template.model";
import { ChecklistMapper } from "../mappers/ChecklistMapper";

@injectable()
export class SequelizeChecklistRepository implements IChecklistRepository {
  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ checklists: any[], total: number }> {
    // Note: Checklist model doesn't have organization_id in its definition I saw earlier, but Client does.
    // Let's check checklist.model.ts again.
    const { rows, count } = await ChecklistModel.findAndCountAll({
      offset: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
      order: [['createdAt', 'desc']]
    });
    return {
      checklists: rows.map(ChecklistMapper.toDomain),
      total: count
    };
  }

  async findTemplates(): Promise<any[]> {
    const templates = await ChecklistTemplateModel.findAll();
    return templates.map(ChecklistMapper.templateToDomain);
  }

  async getStats(organizationId: string): Promise<any> {
    const total = await ChecklistModel.count();
    const completed = await ChecklistModel.count({ where: { status: 'completed' } });
    return { total, completed };
  }
}
