import { Task } from "../../domain/entities/Task";

export class TaskMapper {
  public static toDomain(raw: any): Task {
    const source = typeof raw.get === 'function' ? raw.get({ plain: true }) : raw;
    const toNumberOrNull = (value: any) => value === null || value === undefined ? null : Number(value);
    const props = {
      organizationId: source.organizationId,
      clientId: source.clientId,
      assignedTo: source.assignedTo,
      title: source.title,
      description: source.description,
      status: source.status as any,
      priority: source.priority as any,
      startDate: source.startDate,
      dueDate: source.dueDate,
      taskType: source.taskType,
      moduleType: source.moduleType,
      moduleId: source.moduleId,
      estimatedHours: toNumberOrNull(source.estimatedHours),
      actualHours: toNumberOrNull(source.actualHours),
      tags: source.tags || [],
      checklist: source.checklist || [],
      attachments: source.attachments || [],
      completedAt: source.completedAt,
      createdBy: source.createdBy,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      client: source.client,
      assignee: source.assignee,
      creator: source.creator
    };
    return Task.create(props, source.id).getValue();
  }

  public static toPersistence(task: Task): any {
    return {
      id: task.id,
      organizationId: task.organizationId,
      clientId: task.clientId || null,
      assignedTo: task.assignedTo || null,
      title: task.title,
      description: task.description || null,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate || null,
      dueDate: task.dueDate || null,
      taskType: task.taskType || null,
      moduleType: task.moduleType || null,
      moduleId: task.moduleId || null,
      estimatedHours: task.estimatedHours ?? null,
      actualHours: task.actualHours ?? null,
      tags: task.tags || [],
      checklist: task.checklist || [],
      attachments: task.attachments || [],
      completedAt: task.completedAt,
      createdBy: task.createdBy
    };
  }
}
