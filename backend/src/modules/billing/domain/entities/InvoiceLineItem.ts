import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface InvoiceLineItemProps {
  invoiceId: string;
  serviceTemplateId?: string | null;
  itemId?: string | null;
  variantId?: string | null;
  warehouseId?: string | null;
  batchNo?: string | null;
  trackInventory?: boolean;
  description: string;
  sacCode: string;
  quantity: number;
  unitRate: number;
  amount: number;
  sortOrder: number;
}

export class InvoiceLineItem extends Entity<InvoiceLineItemProps> {
  get invoiceId() { return this.props.invoiceId; }
  get serviceTemplateId() { return this.props.serviceTemplateId; }
  get itemId() { return this.props.itemId; }
  get variantId() { return this.props.variantId; }
  get warehouseId() { return this.props.warehouseId; }
  get batchNo() { return this.props.batchNo; }
  get trackInventory() { return this.props.trackInventory; }
  get description() { return this.props.description; }
  get sacCode() { return this.props.sacCode; }
  get quantity() { return this.props.quantity; }
  get unitRate() { return this.props.unitRate; }
  get amount() { return this.props.amount; }
  get sortOrder() { return this.props.sortOrder; }

  private constructor(props: InvoiceLineItemProps, id?: string) {
    super(props, id);
  }

  public static create(props: InvoiceLineItemProps, id?: string): Result<InvoiceLineItem> {
    const guards = [
      { argument: props.invoiceId, argumentName: 'invoiceId' },
      { argument: props.description, argumentName: 'description' },
      { argument: props.sacCode, argumentName: 'sacCode' },
      { argument: props.quantity, argumentName: 'quantity' },
      { argument: props.unitRate, argumentName: 'unitRate' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<InvoiceLineItem>(guardResult.getError() as string);
    return Result.ok<InvoiceLineItem>(new InvoiceLineItem(props, id));
  }
}
