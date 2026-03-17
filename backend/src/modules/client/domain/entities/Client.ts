import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface ClientProps {
  organizationId: string;
  userId: string;
  code: string;
  name: string;
  gstin?: string | null;
  pan?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  stateCode: string;
  city?: string | null;
  pincode?: string | null;
  creditLimit: number;
  entityType: 'individual' | 'proprietorship' | 'partnership' | 'pvt_ltd' | 'llp' | 'trust' | 'huf' | 'other';
  notes?: string | null;
  metadata?: any;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended'; // Legacy support maybe? Schema only has is_active, but we can map it. Actually, wait. The schema does NOT have 'status' anymore. It has 'is_active'.
  createdAt?: Date;
  updatedAt?: Date;
}

export class Client extends Entity<ClientProps> {
  get organizationId(): string { return this.props.organizationId; }
  get userId(): string { return this.props.userId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get gstin(): string | null | undefined { return this.props.gstin; }
  get pan(): string | null | undefined { return this.props.pan; }
  get mobile(): string | null | undefined { return this.props.mobile; }
  get email(): string | null | undefined { return this.props.email; }
  get address(): string | null | undefined { return this.props.address; }
  get stateCode(): string { return this.props.stateCode; }
  get city(): string | null | undefined { return this.props.city; }
  get pincode(): string | null | undefined { return this.props.pincode; }
  get creditLimit(): number { return this.props.creditLimit; }
  get entityType(): string { return this.props.entityType; }
  get notes(): string | null | undefined { return this.props.notes; }
  get metadata(): any { return this.props.metadata; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  private constructor(props: ClientProps, id?: string) {
    super(props, id);
  }

  public static create(props: ClientProps, id?: string): Result<Client> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.userId, argumentName: 'userId' },
      { argument: props.code, argumentName: 'code' },
      { argument: props.name, argumentName: 'name' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Client>(guardResult.getError() as string);
    return Result.ok<Client>(new Client(props, id));
  }
}
