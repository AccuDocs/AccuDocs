import { ClientRiskScore } from "../entities/ClientRiskScore";

export interface IClientRiskScoreRepository {
  save(score: ClientRiskScore, options?: any): Promise<ClientRiskScore>;
  findByClientId(clientId: string, organizationId: string): Promise<ClientRiskScore | null>;
}
