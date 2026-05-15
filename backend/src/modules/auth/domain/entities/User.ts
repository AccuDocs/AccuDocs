import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface UserProps {
  organizationId: string;
  name: string;
  mobile: string;
  role: 'super_admin' | 'admin' | 'staff' | 'accountant' | 'client';
  isActive: boolean;
  lastLoginAt: Date | null;
  password?: string | null;
  email?: string | null;
  avatarS3Key?: string | null;
  preferences?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Entity<UserProps> {
  get organizationId(): string { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get mobile(): string { return this.props.mobile; }
  get role(): string { return this.props.role; }
  get isActive(): boolean { return this.props.isActive; }
  get lastLoginAt(): Date | null { return this.props.lastLoginAt; }
  get password(): string | null | undefined { return this.props.password; }
  get email(): string | null | undefined { return this.props.email; }
  get avatarS3Key(): string | null | undefined { return this.props.avatarS3Key; }
  get preferences(): any { return this.props.preferences; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  public updateStatus(isActive: boolean): void {
    this.props.isActive = isActive;
  }

  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  public static create(props: UserProps, id?: string): Result<User> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.name, argumentName: 'name' },
      { argument: props.mobile, argumentName: 'mobile' },
      { argument: props.role, argumentName: 'role' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<User>(guardResult.getError() as string);
    return Result.ok<User>(new User(props, id));
  }
}
