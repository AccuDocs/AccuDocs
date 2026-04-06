import { injectable } from "tsyringe";
import { IComplianceRepository } from "../../domain/repositories/IComplianceRepository";
import { ComplianceDeadline as ComplianceDeadlineModel } from "../../../../models/compliance-deadline.model";
import { ClientDeadline as ClientDeadlineModel } from "../../../../models/client-deadline.model";
import { Client as ClientModel } from "../../../../models/client.model";
import { ComplianceMapper } from "../mappers/ComplianceMapper";
import { Op } from "sequelize";

@injectable()
export class SequelizeComplianceRepository implements IComplianceRepository {
  async findUpcoming(organizationId: string, limit: number): Promise<any[]> {
    const deadlines = await ComplianceDeadlineModel.findAll({
      where: {
        dueDate: {
          [Op.gte]: new Date()
        }
      },
      include: [
        {
          model: ClientDeadlineModel,
          as: 'clientDeadlines',
          include: [
            {
              model: ClientModel,
              as: 'client',
              where: { organization_id: organizationId },
              attributes: []
            }
          ],
          required: false
        }
      ],
      order: [['dueDate', 'asc']],
      limit
    });
    return deadlines.map(ComplianceMapper.toDomain);
  }

  async findAll(organizationId: string, filters: any): Promise<any[]> {
    const where: any = {};
    if (filters.year) {
      const yearStart = new Date(`${filters.year}-01-01`);
      const yearEnd = new Date(`${filters.year}-12-31T23:59:59`);
      where.dueDate = { [Op.between]: [yearStart, yearEnd] };
    }
    
    // If clientId is provided, we want to see deadlines for that specific client
    // including their status from ClientDeadline
    const include: any[] = [
      {
        model: ClientDeadlineModel,
        as: 'clientDeadlines',
        include: [
          {
            model: ClientModel,
            as: 'client',
            where: { 
              organization_id: organizationId,
              ...(filters.clientId ? { id: filters.clientId } : {})
            },
            attributes: ['id', 'name']
          }
        ],
        required: filters.clientId ? true : false
      }
    ];

    const deadlines = await ComplianceDeadlineModel.findAll({
      where,
      include,
      order: [['dueDate', 'asc']]
    });
    
    return deadlines.map(raw => {
      const domain = ComplianceMapper.toDomain(raw);
      if (raw.clientDeadlines && raw.clientDeadlines.length > 0) {
        domain.status = raw.clientDeadlines[0].status;
        domain.filedDate = raw.clientDeadlines[0].filedDate;
        domain.notes = raw.clientDeadlines[0].notes;
        domain.clientName = raw.clientDeadlines[0].client?.name;
      }
      return domain;
    });
  }

  async getStats(organizationId: string): Promise<any> {
    // Total global deadlines
    const total = await ComplianceDeadlineModel.count();
    
    // Count pending client deadlines for this organization
    const upcoming = await ClientDeadlineModel.count({
      where: { status: 'pending' },
      include: [
        {
          model: ClientModel,
          as: 'client',
          where: { organization_id: organizationId },
          attributes: []
        }
      ]
    });
    
    return { total, upcoming };
  }

  async create(data: any): Promise<any> {
    const deadline = await ComplianceDeadlineModel.create({
      type: data.type,
      title: data.title,
      dueDate: data.dueDate,
      recurring: data.recurring || false,
      recurringPattern: data.recurringPattern,
      description: data.description,
      isSeeded: false
    });

    if (data.clientId) {
      await ClientDeadlineModel.create({
        clientId: data.clientId,
        deadlineId: deadline.id,
        status: 'pending'
      });
    }

    return ComplianceMapper.toDomain(deadline);
  }
}
