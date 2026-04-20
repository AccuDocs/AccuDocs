import { Entity } from '../../../../shared/core/Entity';
import { Result } from '../../../../shared/core/Result';
import { Guard } from '../../../../shared/core/Guard';

export type TransactionType =
  | 'purchase' | 'sale' | 'transfer_in' | 'transfer_out'
  | 'adjustment' | 'opening_stock' | 'return' | 'damage' | 'production';

export type ReferenceType = 'invoice' | 'purchase_order' | 'transfer' | 'manual';
export type ValuationMethod = 'FIFO' | 'weighted_avg';

export interface StockMovementProps {
  orgId: string;
  warehouseId: string;
  itemId: string;
  variantId?: string | null;
  transactionType: TransactionType;
  referenceType?: ReferenceType | null;
  referenceId?: string | null;
  clientId?: string | null;
  batchNo?: string | null;
  serialNo?: string | null;
  qtyIn: number;
  qtyOut: number;
  rate: number;
  valuationMethod: ValuationMethod;
  runningBalance: number;
  transactionDate: Date;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
}

export class StockMovement extends Entity<StockMovementProps> {
  get orgId()            { return this.props.orgId; }
  get warehouseId()      { return this.props.warehouseId; }
  get itemId()           { return this.props.itemId; }
  get variantId()        { return this.props.variantId; }
  get transactionType()  { return this.props.transactionType; }
  get referenceType()    { return this.props.referenceType; }
  get referenceId()      { return this.props.referenceId; }
  get clientId()         { return this.props.clientId; }
  get batchNo()          { return this.props.batchNo; }
  get serialNo()         { return this.props.serialNo; }
  get qtyIn()            { return this.props.qtyIn; }
  get qtyOut()           { return this.props.qtyOut; }
  get rate()             { return this.props.rate; }
  get valuationMethod()  { return this.props.valuationMethod; }
  get runningBalance()   { return this.props.runningBalance; }
  get transactionDate()  { return this.props.transactionDate; }
  get notes()            { return this.props.notes; }
  get createdBy()        { return this.props.createdBy; }
  get createdAt()        { return this.props.createdAt; }

  private constructor(props: StockMovementProps, id?: string) {
    super(props, id);
  }

  public static create(props: StockMovementProps, id?: string): Result<StockMovement> {
    const guards = [
      { argument: props.orgId,           argumentName: 'orgId' },
      { argument: props.warehouseId,     argumentName: 'warehouseId' },
      { argument: props.itemId,          argumentName: 'itemId' },
      { argument: props.transactionType, argumentName: 'transactionType' },
      { argument: props.createdBy,       argumentName: 'createdBy' },
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<StockMovement>(guardResult.getError() as string);

    if (props.qtyIn < 0 || props.qtyOut < 0) {
      return Result.fail<StockMovement>('qtyIn and qtyOut must be non-negative');
    }

    return Result.ok<StockMovement>(new StockMovement(props, id));
  }
}
