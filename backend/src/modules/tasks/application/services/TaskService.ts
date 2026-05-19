import { injectable, inject } from "tsyringe";
import { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { Task } from "../../domain/entities/Task";
import { AppError, NotFoundError } from "../../../../utils/errors";

const normalizeStatusForPersistence = (status?: string): any => {
  switch (status) {
    case 'in-progress':
      return 'in_progress';
    case 'pending':
      return 'todo';
    case 'completed':
      return 'done';
    default:
      return status || 'todo';
  }
};

@injectable()
export class TaskService {
  constructor(
    @inject("ITaskRepository") private taskRepo: ITaskRepository
  ) {}

  async createTask(organizationId: string, creatorId: string, data: any) {
    const props = {
      organizationId,
      clientId: data.clientId,
      assignedTo: data.assignedTo,
      title: data.title,
      description: data.description,
      status: normalizeStatusForPersistence(data.status),
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdBy: creatorId
    };

    const taskResult = Task.create(props);
    if (taskResult.isFailure) throw new AppError(taskResult.getError() as string, 400);

    const task = await this.taskRepo.save(taskResult.getValue());
    
    // Potential integration: NotificationsService.notifyTaskAssigned()
    
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority
    };
  }

  async getTasks(organizationId: string, filters: any, pagination: any) {
    return this.taskRepo.findAll(organizationId, filters, pagination);
  }

  async getTaskById(organizationId: string, id: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');
    return task;
  }

  async updateStatus(organizationId: string, id: string, newStatus: string) {
    const task = await this.taskRepo.findById(id, organizationId);
    if (!task) throw new NotFoundError('Task not found');

    const normalizedStatus = normalizeStatusForPersistence(newStatus);
    (task as any).props.status = normalizedStatus;
    if (normalizedStatus === 'done') {
      (task as any).props.completedAt = new Date();
    } else {
      (task as any).props.completedAt = null;
    }

    const saved = await this.taskRepo.save(task);
    return { id: saved.id, status: saved.status };
  }

  async getStats(organizationId: string) {
    const { tasks } = await this.taskRepo.findAll(organizationId, {}, { page: 1, limit: 1000 });
    
    const stats = {
      todo: tasks.filter((t: any) => t.status === 'todo' || t.status === 'pending').length,
      in_progress: tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'in-progress').length,
      review: tasks.filter((t: any) => t.status === 'review').length,
      done: tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length,
      total: tasks.length
    };
    
    return stats;
  }
}
