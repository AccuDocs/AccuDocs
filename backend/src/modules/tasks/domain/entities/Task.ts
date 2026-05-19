import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface TaskProps {
  organizationId: string;
  clientId?: string | null;
  assignedTo?: string | null;
  title: string;
  description?: string | null;
  status: 'todo' | 'pending' | 'in-progress' | 'in_progress' | 'review' | 'done' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date | null;
  completedAt?: Date | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Task extends Entity<TaskProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get assignedTo() { return this.props.assignedTo; }
  get title() { return this.props.title; }
  get description() { return this.props.description; }
  get status() { return this.props.status; }
  get priority() { return this.props.priority; }
  get dueDate() { return this.props.dueDate; }
  get completedAt() { return this.props.completedAt; }
  get createdBy() { return this.props.createdBy; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: TaskProps, id?: string) {
    super(props, id);
  }

  public static create(props: TaskProps, id?: string): Result<Task> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.title, argumentName: 'title' },
      { argument: props.status, argumentName: 'status' },
      { argument: props.priority, argumentName: 'priority' },
      { argument: props.createdBy, argumentName: 'createdBy' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Task>(guardResult.getError() as string);
    return Result.ok<Task>(new Task(props, id));
  }
}
