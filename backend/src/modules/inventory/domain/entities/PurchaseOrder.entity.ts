import { Entity } from '../../../../shared/core/Entity';
import { Result } from '../../../../shared/core/Result';
import { Guard } from '../../../../shared/core/Guard';

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderProps {
  orgId: string;
  branchId?: string | null;
  supplierClientId: string;
  poNumber: string;
  poDate: Date;
  expectedDeliveryDate?: Date | null;
  warehouseId: string;
  status: POStatus;
  subtotal: number;
  gstAmount: number;
  total: number;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PurchaseOrder extends Entity<PurchaseOrderProps> {
  get orgId()                { return this.props.orgId; }
  get branchId()             { return this.props.branchId; }
  get supplierClientId()     { return this.props.supplierClientId; }
  get poNumber()             { return this.props.poNumber; }
  get poDate()               { return this.props.poDate; }
  get expectedDeliveryDate() { return this.props.expectedDeliveryDate; }
  get warehouseId()          { return this.props.warehouseId; }
  get status()               { return this.props.status; }
  get subtotal()             { return this.props.subtotal; }
  get gstAmount()            { return this.props.gstAmount; }
  get total()                { return this.props.total; }
  get notes()                { return this.props.notes; }
  get createdBy()            { return this.props.createdBy; }
  get createdAt()            { return this.props.createdAt; }
  get updatedAt()            { return this.props.updatedAt; }

  private constructor(props: PurchaseOrderProps, id?: string) {
    super(props, id);
  }

  public static create(props: PurchaseOrderProps, id?: string): Result<PurchaseOrder> {
    const guards = [
      { argument: props.orgId,            argumentName: 'orgId' },
      { argument: props.supplierClientId, argumentName: 'supplierClientId' },
      { argument: props.poNumber,         argumentName: 'poNumber' },
      { argument: props.warehouseId,      argumentName: 'warehouseId' },
      { argument: props.createdBy,        argumentName: 'createdBy' },
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<PurchaseOrder>(guardResult.getError() as string);
    return Result.ok<PurchaseOrder>(new PurchaseOrder(props, id));
  }
}
