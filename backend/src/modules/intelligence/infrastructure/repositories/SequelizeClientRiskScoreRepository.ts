import { injectable } from "tsyringe";
import { IClientRiskScoreRepository } from "../../domain/repositories/IClientRiskScoreRepository";
import { ClientRiskScore } from "../../domain/entities/ClientRiskScore";
import { ClientRiskScore as ClientRiskScoreModel } from "../../../../models";
import { IntelligenceMapper } from "../mappers/IntelligenceMapper";

@injectable()
export class SequelizeClientRiskScoreRepository implements IClientRiskScoreRepository {
  async save(score: ClientRiskScore, options?: any): Promise<ClientRiskScore> {
    const raw = IntelligenceMapper.toRiskScorePersistence(score);
    const exists = await ClientRiskScoreModel.findByPk(score.id, { transaction: options?.transaction });

    if (exists) {
      await exists.update(raw, options);
    } else {
      await ClientRiskScoreModel.create(raw, options);
    }

    const saved = await ClientRiskScoreModel.findByPk(score.id, { transaction: options?.transaction });
    return IntelligenceMapper.toRiskScoreDomain(saved);
  }

  async findByClientId(clientId: string, organizationId: string): Promise<ClientRiskScore | null> {
    const score = await ClientRiskScoreModel.findOne({
      where: { clientId, organizationId },
      order: [['lastCalculated', 'DESC']]
    });
    if (!score) return null;
    return IntelligenceMapper.toRiskScoreDomain(score);
  }
}
