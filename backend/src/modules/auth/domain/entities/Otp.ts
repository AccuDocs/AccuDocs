import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface OtpProps {
  mobile: string;
  otpHash: string;
  purpose: 'login' | 'verify' | 'reset';
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  ipAddress: string | null;
  createdAt?: Date;
}

export class Otp extends Entity<OtpProps> {
  get mobile(): string { return this.props.mobile; }
  get otpHash(): string { return this.props.otpHash; }
  get purpose(): string { return this.props.purpose; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get attempts(): number { return this.props.attempts; }
  get isUsed(): boolean { return this.props.isUsed; }
  get ipAddress(): string | null { return this.props.ipAddress; }
  get createdAt(): Date | undefined { return this.props.createdAt; }

  private constructor(props: OtpProps, id?: string) {
    super(props, id);
  }

  public static create(props: OtpProps, id?: string): Result<Otp> {
    const guards = [
      { argument: props.mobile, argumentName: 'mobile' },
      { argument: props.otpHash, argumentName: 'otpHash' },
      { argument: props.expiresAt, argumentName: 'expiresAt' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Otp>(guardResult.getError() as string);
    return Result.ok<Otp>(new Otp(props, id));
  }
}
