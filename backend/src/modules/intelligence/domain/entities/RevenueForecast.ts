import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface RevenueForecastProps {
  organizationId: string;
  clientId: string;
  financialYear: string;
  expectedRevenue: number;
  realizedRevenue: number;
  confidenceScore: number;
  aiPredictions: any;
  updatedAt?: Date;
}

export class RevenueForecast extends Entity<RevenueForecastProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get financialYear() { return this.props.financialYear; }
  get expectedRevenue() { return this.props.expectedRevenue; }
  get realizedRevenue() { return this.props.realizedRevenue; }
  get confidenceScore() { return this.props.confidenceScore; }
  get aiPredictions() { return this.props.aiPredictions; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: RevenueForecastProps, id?: string) {
    super(props, id);
  }

  public static create(props: RevenueForecastProps, id?: string): Result<RevenueForecast> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.clientId, argumentName: 'clientId' },
      { argument: props.financialYear, argumentName: 'financialYear' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<RevenueForecast>(guardResult.getError() as string);
    return Result.ok<RevenueForecast>(new RevenueForecast(props, id));
  }
}
