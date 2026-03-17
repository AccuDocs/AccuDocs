import { Task } from "../../domain/entities/Task";

export class TaskMapper {
  public static toDomain(raw: any): Task {
    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      assignedTo: raw.assignedTo,
      title: raw.title,
      description: raw.description,
      status: raw.status as any,
      priority: raw.priority as any,
      dueDate: raw.dueDate,
      completedAt: raw.completedAt,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    };
    return Task.create(props, raw.id).getValue();
  }

  public static toPersistence(task: Task): any {
    return {
      id: task.id,
      organizationId: task.organizationId,
      clientId: task.clientId,
      assignedTo: task.assignedTo,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdBy: task.createdBy
    };
  }
}
