import { Entity } from '../../../../shared/core/Entity';
import { Result } from '../../../../shared/core/Result';
import { Guard } from '../../../../shared/core/Guard';

export interface WarehouseProps {
  orgId: string;
  branchId?: string | null;
  name: string;
  code: string;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Warehouse extends Entity<WarehouseProps> {
  get orgId()     { return this.props.orgId; }
  get branchId()  { return this.props.branchId; }
  get name()      { return this.props.name; }
  get code()      { return this.props.code; }
  get address()   { return this.props.address; }
  get gstin()     { return this.props.gstin; }
  get isActive()  { return this.props.isActive; }
  get isDefault() { return this.props.isDefault; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: WarehouseProps, id?: string) {
    super(props, id);
  }

  public static create(props: WarehouseProps, id?: string): Result<Warehouse> {
    const guards = [
      { argument: props.orgId, argumentName: 'orgId' },
      { argument: props.name,  argumentName: 'name' },
      { argument: props.code,  argumentName: 'code' },
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Warehouse>(guardResult.getError() as string);
    return Result.ok<Warehouse>(new Warehouse(props, id));
  }
}
