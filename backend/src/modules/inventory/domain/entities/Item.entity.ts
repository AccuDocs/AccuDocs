import { Entity } from '../../../../shared/core/Entity';
import { Result } from '../../../../shared/core/Result';
import { Guard } from '../../../../shared/core/Guard';

export interface ItemProps {
  organizationId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hsnSacCode?: string | null;
  itemType: 'goods' | 'service';
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  gstRate: number;
  cessRate: number;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  reorderPoint?: number | null;
  reorderQty?: number | null;
  categoryId?: string | null;
  isActive: boolean;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Item extends Entity<ItemProps> {
  get organizationId()     { return this.props.organizationId; }
  get name()               { return this.props.name; }
  get sku()                { return this.props.sku; }
  get barcode()            { return this.props.barcode; }
  get hsnSacCode()         { return this.props.hsnSacCode; }
  get itemType()           { return this.props.itemType; }
  get unitOfMeasure()      { return this.props.unitOfMeasure; }
  get purchasePrice()      { return this.props.purchasePrice; }
  get sellingPrice()       { return this.props.sellingPrice; }
  get mrp()                { return this.props.mrp; }
  get gstRate()            { return this.props.gstRate; }
  get cessRate()           { return this.props.cessRate; }
  get trackInventory()     { return this.props.trackInventory; }
  get allowNegativeStock() { return this.props.allowNegativeStock; }
  get reorderPoint()       { return this.props.reorderPoint; }
  get reorderQty()         { return this.props.reorderQty; }
  get categoryId()         { return this.props.categoryId; }
  get isActive()           { return this.props.isActive; }
  get description()        { return this.props.description; }
  get createdAt()          { return this.props.createdAt; }
  get updatedAt()          { return this.props.updatedAt; }

  private constructor(props: ItemProps, id?: string) {
    super(props, id);
  }

  public static create(props: ItemProps, id?: string): Result<Item> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.name,           argumentName: 'name' },
      { argument: props.itemType,       argumentName: 'itemType' },
      { argument: props.unitOfMeasure,  argumentName: 'unitOfMeasure' },
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Item>(guardResult.getError() as string);

    const validTypes = ['goods', 'service'];
    if (!validTypes.includes(props.itemType)) {
      return Result.fail<Item>(`itemType must be one of: ${validTypes.join(', ')}`);
    }

    return Result.ok<Item>(new Item(props, id));
  }
}
