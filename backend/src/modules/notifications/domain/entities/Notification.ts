import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface NotificationProps {
  organizationId: string;
  userId: string;
  type: 'invoice_due' | 'document_uploaded' | 'task_assigned' | 'alert' | string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt?: Date;
}

export class Notification extends Entity<NotificationProps> {
  get organizationId() { return this.props.organizationId; }
  get userId() { return this.props.userId; }
  get type() { return this.props.type; }
  get title() { return this.props.title; }
  get message() { return this.props.message; }
  get isRead() { return this.props.isRead; }
  get metadata() { return this.props.metadata; }
  get createdAt() { return this.props.createdAt; }

  private constructor(props: NotificationProps, id?: string) {
    super(props, id);
  }

  public static create(props: NotificationProps, id?: string): Result<Notification> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.userId, argumentName: 'userId' },
      { argument: props.type, argumentName: 'type' },
      { argument: props.title, argumentName: 'title' },
      { argument: props.message, argumentName: 'message' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Notification>(guardResult.getError() as string);
    return Result.ok<Notification>(new Notification(props, id));
  }
}
