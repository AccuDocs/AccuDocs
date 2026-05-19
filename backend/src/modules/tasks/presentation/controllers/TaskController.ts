import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { TaskService } from '../../application/services/TaskService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const toApiTaskStatus = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'in-progress';
    case 'pending':
      return 'todo';
    case 'completed':
      return 'done';
    default:
      return status;
  }
};

export class TaskController {
  
  static createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const task = await service.createTask(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, { ...task, status: toApiTaskStatus(task.status) }, 'Task created successfully');
  });

  static getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const { status, priority, clientId, assignedTo, search, page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;

    const { tasks, total } = await service.getTasks(
      req.user!.organizationId,
      { status: status as string, priority: priority as string, clientId: clientId as string, assignedTo: assignedTo as string, search: search as string },
      { page: Number(page), limit: Number(limit), sortBy: sortBy as string, sortOrder: sortOrder as any }
    );
    
    // Clean response format
    const formatted = tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: toApiTaskStatus(t.status),
      priority: t.priority,
      clientId: t.clientId,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      createdAt: t.createdAt
    }));

    sendPaginated(res, formatted, Number(page), Number(limit), total);
  });

  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const result = await service.updateStatus(req.user!.organizationId, req.params.id, req.body.status);
    sendSuccess(res, { ...result, status: toApiTaskStatus(result.status) }, 'Task status updated');
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const stats = await service.getStats(req.user!.organizationId);
    sendSuccess(res, stats);
  });
}
