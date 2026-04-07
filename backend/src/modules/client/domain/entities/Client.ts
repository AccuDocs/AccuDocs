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
  location?: string | null;
  creditLimit: number;
  entityType: 'individual' | 'proprietorship' | 'partnership' | 'pvt_ltd' | 'pub_ltd' | 'llp' | 'trust_ngo' | 'other';
  businessName?: string | null;
  industrySector?: string | null;
  incorporationDate?: Date | null;
  gstStatus?: string | null;
  financialYearEnd?: string | null;
  accountingMethod?: string | null;
  estimatedTurnover?: string | null;
  employeeCount?: string | null;
  identityProofUrl?: string | null;
  businessRegistrationUrl?: string | null;
  taxCardCopyUrl?: string | null;
  previousYearReturnUrl?: string | null;
  termsAccepted: boolean;
  notes?: string | null;
  metadata?: any;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
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
  get location(): string | null | undefined { return this.props.location; }
  get creditLimit(): number { return this.props.creditLimit; }
  get entityType(): string { return this.props.entityType; }
  get businessName(): string | null | undefined { return this.props.businessName; }
  get industrySector(): string | null | undefined { return this.props.industrySector; }
  get incorporationDate(): Date | null | undefined { return this.props.incorporationDate; }
  get gstStatus(): string | null | undefined { return this.props.gstStatus; }
  get financialYearEnd(): string | null | undefined { return this.props.financialYearEnd; }
  get accountingMethod(): string | null | undefined { return this.props.accountingMethod; }
  get estimatedTurnover(): string | null | undefined { return this.props.estimatedTurnover; }
  get employeeCount(): string | null | undefined { return this.props.employeeCount; }
  get identityProofUrl(): string | null | undefined { return this.props.identityProofUrl; }
  get businessRegistrationUrl(): string | null | undefined { return this.props.businessRegistrationUrl; }
  get taxCardCopyUrl(): string | null | undefined { return this.props.taxCardCopyUrl; }
  get previousYearReturnUrl(): string | null | undefined { return this.props.previousYearReturnUrl; }
  get termsAccepted(): boolean { return this.props.termsAccepted; }
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
