import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface ClientRiskScoreProps {
  organizationId: string;
  clientId: string;
  riskScore: number;
  factors: any[];
  lastCalculated?: Date;
}

export class ClientRiskScore extends Entity<ClientRiskScoreProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get riskScore() { return this.props.riskScore; }
  get factors() { return this.props.factors; }
  get lastCalculated() { return this.props.lastCalculated; }

  private constructor(props: ClientRiskScoreProps, id?: string) {
    super(props, id);
  }

  public static create(props: ClientRiskScoreProps, id?: string): Result<ClientRiskScore> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.clientId, argumentName: 'clientId' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<ClientRiskScore>(guardResult.getError() as string);
    return Result.ok<ClientRiskScore>(new ClientRiskScore(props, id));
  }
}
