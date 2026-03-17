import { injectable } from "tsyringe";
import { IComplianceRepository } from "../../domain/repositories/IComplianceRepository";
import { ComplianceDeadline as ComplianceDeadlineModel } from "../../../../models/compliance-deadline.model";
import { ComplianceMapper } from "../mappers/ComplianceMapper";
import { Op } from "sequelize";

@injectable()
export class SequelizeComplianceRepository implements IComplianceRepository {
  async findUpcoming(limit: number): Promise<any[]> {
    const deadlines = await ComplianceDeadlineModel.findAll({
      where: {
        dueDate: {
          [Op.gte]: new Date()
        }
      },
      order: [['dueDate', 'asc']],
      limit
    });
    return deadlines.map(ComplianceMapper.toDomain);
  }

  async getStats(): Promise<any> {
    const total = await ComplianceDeadlineModel.count();
    const upcoming = await ComplianceDeadlineModel.count({
      where: {
        dueDate: {
          [Op.gte]: new Date()
        }
      }
    });
    return { total, upcoming };
  }
}
