import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { Task } from "../../domain/entities/Task";
import { AppError, NotFoundError } from "../../../../utils/errors";
import { sequelize } from "../../../../config/database.config";
import { logger } from "../../../../utils/logger";

const normalizeStatusForPersistence = (status?: string): any => {
  switch (status) {
    case 'in-progress':
      return 'in_progress';
    case 'todo':
      return 'pending';
    case 'done':
      return 'completed';
    default:
      return status || 'pending';
  }
};

const toDateOrNull = (value: any): Date | null => value ? new Date(value) : null;
const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toArray = (value: any): any[] => Array.isArray(value) ? value : [];

@injectable()
export class TaskService {
  constructor(
    @inject("ITaskRepository") private taskRepo: ITaskRepository
  ) {}

  async createTask(organizationId: string, creatorId: string, data: any) {
    const props = {
      organizationId,
      clientId: data.clientId || null,
      assignedTo: data.assignedTo || null,
      title: data.title,
      description: data.description || null,
      status: normalizeStatusForPersistence(data.status),
      priority: data.priority || 'medium',
      startDate: toDateOrNull(data.startDate),
      dueDate: toDateOrNull(data.dueDate),
      taskType: data.taskType || null,
      moduleType: data.moduleType || null,
      moduleId: data.moduleId || null,
      estimatedHours: toNumberOrNull(data.estimatedHours),
      actualHours: toNumberOrNull(data.actualHours),
      tags: toArray(data.tags),
      checklist: toArray(data.checklist),
      attachments: toArray(data.attachments),
      createdBy: creatorId
    };

    const taskResult = Task.create(props);
    if (taskResult.isFailure) throw new AppError(taskResult.getError() as string, 400);

    const task = await this.taskRepo.save(taskResult.getValue());
    await this.recordActivity(task.id, organizationId, creatorId, 'created', null, this.snapshotTask(task));
    return task;
  }

  async getTasks(organizationId: string, filters: any, pagination: any) {
    return this.taskRepo.findAll(organizationId, filters, pagination);
  }

  async getTaskById(organizationId: string, id: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');
    return task;
  }

  async updateTask(organizationId: string, userId: string, id: string, data: any) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');

    const before = this.snapshotTask(task);
    const props = (task as any).props;

    if (Object.prototype.hasOwnProperty.call(data, 'clientId')) props.clientId = data.clientId || null;
    if (Object.prototype.hasOwnProperty.call(data, 'assignedTo')) props.assignedTo = data.assignedTo || null;
    if (Object.prototype.hasOwnProperty.call(data, 'title')) props.title = data.title;
    if (Object.prototype.hasOwnProperty.call(data, 'description')) props.description = data.description || null;
    if (Object.prototype.hasOwnProperty.call(data, 'priority')) props.priority = data.priority;
    if (Object.prototype.hasOwnProperty.call(data, 'status')) props.status = normalizeStatusForPersistence(data.status);
    if (Object.prototype.hasOwnProperty.call(data, 'startDate')) props.startDate = toDateOrNull(data.startDate);
    if (Object.prototype.hasOwnProperty.call(data, 'dueDate')) props.dueDate = toDateOrNull(data.dueDate);
    if (Object.prototype.hasOwnProperty.call(data, 'taskType')) props.taskType = data.taskType || null;
    if (Object.prototype.hasOwnProperty.call(data, 'moduleType')) props.moduleType = data.moduleType || null;
    if (Object.prototype.hasOwnProperty.call(data, 'moduleId')) props.moduleId = data.moduleId || null;
    if (Object.prototype.hasOwnProperty.call(data, 'estimatedHours')) props.estimatedHours = toNumberOrNull(data.estimatedHours);
    if (Object.prototype.hasOwnProperty.call(data, 'actualHours')) props.actualHours = toNumberOrNull(data.actualHours);
    if (Object.prototype.hasOwnProperty.call(data, 'tags')) props.tags = toArray(data.tags);
    if (Object.prototype.hasOwnProperty.call(data, 'checklist')) props.checklist = toArray(data.checklist);
    if (Object.prototype.hasOwnProperty.call(data, 'attachments')) props.attachments = toArray(data.attachments);

    props.completedAt = props.status === 'completed' ? (props.completedAt || new Date()) : null;

    const taskResult = Task.create(props, task.id);
    if (taskResult.isFailure) throw new AppError(taskResult.getError() as string, 400);

    const saved = await this.taskRepo.save(taskResult.getValue());
    await this.recordActivity(saved.id, organizationId, userId, 'updated', before, this.snapshotTask(saved));
    return saved;
  }

  async updateStatus(organizationId: string, userId: string, id: string, newStatus: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');

    const before = this.snapshotTask(task);
    const normalizedStatus = normalizeStatusForPersistence(newStatus);
    (task as any).props.status = normalizedStatus;
    if (normalizedStatus === 'completed') {
      (task as any).props.completedAt = new Date();
    } else {
      (task as any).props.completedAt = null;
    }

    const saved = await this.taskRepo.save(task);
    await this.recordActivity(saved.id, organizationId, userId, 'status_changed', before, this.snapshotTask(saved));
    return { id: saved.id, status: saved.status };
  }

  async deleteTask(organizationId: string, userId: string, id: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');

    const before = this.snapshotTask(task);
    await this.taskRepo.delete(id, organizationId);
    await this.recordActivity(id, organizationId, userId, 'deleted', before, null);
  }

  async getStats(organizationId: string) {
    const { tasks } = await this.taskRepo.findAll(organizationId, {}, { page: 1, limit: 1000 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isOpen = (task: any) => task.status !== 'completed' && task.status !== 'done';
    const dueTodayCount = tasks.filter((task: any) => {
      if (!task.dueDate || !isOpen(task)) return false;
      const due = new Date(task.dueDate);
      return due >= today && due < tomorrow;
    }).length;
    const overdueCount = tasks.filter((task: any) => {
      if (!task.dueDate || !isOpen(task)) return false;
      const due = new Date(task.dueDate);
      return due < today;
    }).length;
    
    const stats = {
      totalTasks: tasks.length,
      dueTodayCount,
      overdueCount,
      byStatus: {
        pending: tasks.filter((t: any) => t.status === 'todo' || t.status === 'pending').length,
        'in-progress': tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'in-progress').length,
        review: tasks.filter((t: any) => t.status === 'review').length,
        completed: tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length,
      }
    };
    
    return stats;
  }

  private snapshotTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      clientId: task.clientId,
      dueDate: task.dueDate,
      taskType: task.taskType,
      moduleType: task.moduleType,
      moduleId: task.moduleId,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      tags: task.tags || [],
      checklist: task.checklist || [],
    };
  }

  private async recordActivity(
    taskId: string,
    organizationId: string,
    userId: string,
    action: string,
    oldValue: any,
    newValue: any
  ) {
    try {
      await sequelize.query(
        `INSERT INTO task_activity_logs (task_id, organization_id, action, old_value, new_value, user_id)
         VALUES (:taskId, :organizationId, :action, CAST(:oldValue AS jsonb), CAST(:newValue AS jsonb), :userId)`,
        {
          replacements: {
            taskId,
            organizationId,
            action,
            oldValue: oldValue ? JSON.stringify(oldValue) : null,
            newValue: newValue ? JSON.stringify(newValue) : null,
            userId,
          },
        }
      );
    } catch (error) {
      logger.warn('Unable to record task activity log', error);
    }
  }
}
