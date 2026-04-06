import { injectable } from "tsyringe";
import { IChecklistRepository } from "../../domain/repositories/IChecklistRepository";
import { Checklist as ChecklistModel } from "../../../../models/checklist.model";
import { ChecklistTemplate as ChecklistTemplateModel } from "../../../../models/checklist-template.model";
import { Client as ClientModel } from "../../../../models/client.model";
import { ChecklistMapper } from "../mappers/ChecklistMapper";
import { Op, Transaction } from "sequelize";

@injectable()
export class SequelizeChecklistRepository implements IChecklistRepository {
  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ checklists: any[], total: number }> {
    const where: any = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;
    if (filters.serviceType) where.serviceType = filters.serviceType;
    if (filters.financialYear) where.financialYear = filters.financialYear;

    const { rows, count } = await ChecklistModel.findAndCountAll({
      where,
      include: [
        {
          model: ClientModel,
          as: 'client',
          where: { organization_id: organizationId },
          attributes: ['id', 'name', 'organization_id']
        }
      ],
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
    // Templates can be global (is_default = true) or org-specific (not yet implemented in schema, but let's assume global for now)
    const templates = await ChecklistTemplateModel.findAll({
      where: {
        [Op.or]: [
          { isDefault: true },
          // { createdBy: organizationId } // If we add org-specific templates later
        ]
      },
      order: [['name', 'asc']]
    });
    return templates.map(ChecklistMapper.templateToDomain);
  }

  async getStats(organizationId: string): Promise<any> {
    const { count } = await ChecklistModel.findAndCountAll({
      include: [
        {
          model: ClientModel,
          as: 'client',
          where: { organization_id: organizationId },
          attributes: []
        }
      ]
    });

    const completed = await ChecklistModel.count({
      where: { status: 'completed' },
      include: [
        {
          model: ClientModel,
          as: 'client',
          where: { organization_id: organizationId },
          attributes: []
        }
      ]
    });

    return { total: count, completed };
  }

  async findTemplateById(id: string): Promise<any | null> {
    const template = await ChecklistTemplateModel.findByPk(id);
    return template ? ChecklistMapper.templateToDomain(template) : null;
  }

  async create(checklist: any, options?: { transaction?: Transaction }): Promise<void> {
    await ChecklistModel.create(checklist, options);
  }
}
