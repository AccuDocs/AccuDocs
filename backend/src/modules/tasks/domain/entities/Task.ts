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
  startDate?: Date | null;
  dueDate?: Date | null;
  taskType?: string | null;
  moduleType?: string | null;
  moduleId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[];
  checklist?: any[];
  attachments?: any[];
  completedAt?: Date | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  client?: any;
  assignee?: any;
  creator?: any;
}

export class Task extends Entity<TaskProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get assignedTo() { return this.props.assignedTo; }
  get title() { return this.props.title; }
  get description() { return this.props.description; }
  get status() { return this.props.status; }
  get priority() { return this.props.priority; }
  get startDate() { return this.props.startDate; }
  get dueDate() { return this.props.dueDate; }
  get taskType() { return this.props.taskType; }
  get moduleType() { return this.props.moduleType; }
  get moduleId() { return this.props.moduleId; }
  get estimatedHours() { return this.props.estimatedHours; }
  get actualHours() { return this.props.actualHours; }
  get tags() { return this.props.tags; }
  get checklist() { return this.props.checklist; }
  get attachments() { return this.props.attachments; }
  get completedAt() { return this.props.completedAt; }
  get createdBy() { return this.props.createdBy; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }
  get client() { return this.props.client; }
  get assignee() { return this.props.assignee; }
  get creator() { return this.props.creator; }

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
