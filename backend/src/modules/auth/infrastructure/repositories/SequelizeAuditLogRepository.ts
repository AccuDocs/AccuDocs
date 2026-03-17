import { injectable } from "tsyringe";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";
import { AuditLog as AuditLogModel } from "../../../../models/AuditLog.model";
import { Op } from "sequelize";

@injectable()
export class SequelizeAuditLogRepository implements IAuditLogRepository {
  async getStats(organizationId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const counts = await AuditLogModel.findAll({
      attributes: [
        'action',
        [AuditLogModel.sequelize!.fn('COUNT', AuditLogModel.sequelize!.col('id')), 'count']
      ],
      where: {
        organizationId,
        createdAt: {
          [Op.gte]: startDate
        }
      },
      group: ['action']
    });

    return counts.reduce((acc: any, curr: any) => {
      acc[curr.action] = Number(curr.get('count'));
      return acc;
    }, {});
  }
}
