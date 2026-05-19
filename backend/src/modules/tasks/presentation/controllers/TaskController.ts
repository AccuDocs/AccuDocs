import { Response } from 'express';
import { container } from 'tsyringe';
import { TaskService } from '../../application/services/TaskService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

const toApiTaskStatus = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'in-progress';
    case 'todo':
      return 'pending';
    case 'done':
      return 'completed';
    case 'pending':
    case 'completed':
    case 'review':
    case 'cancelled':
      return status;
    case 'in-progress':
      return status;
    default:
      return status;
  }
};

const formatTask = (task: any) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: toApiTaskStatus(task.status),
  priority: task.priority,
  clientId: task.clientId,
  assignedTo: task.assignedTo,
  createdBy: task.createdBy,
  startDate: task.startDate,
  dueDate: task.dueDate,
  taskType: task.taskType,
  moduleType: task.moduleType,
  moduleId: task.moduleId,
  estimatedHours: task.estimatedHours,
  actualHours: task.actualHours,
  tags: task.tags || [],
  checklist: task.checklist || [],
  attachments: task.attachments || [],
  completedAt: task.completedAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  client: task.client || null,
  assignee: task.assignee || null,
  creator: task.creator || null,
});

const scopedAssignedTo = (req: AuthenticatedRequest, requestedAssignedTo: any) => {
  switch (req.user?.role) {
    case 'staff':
    case 'accountant':
    case 'client':
      return req.user.userId;
    default:
      return requestedAssignedTo as string;
  }
};

export class TaskController {
  
  static createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const task = await service.createTask(req.user!.organizationId, req.user!.userId, req.body);
    sendCreated(res, formatTask(task), 'Task created successfully');
  });

  static getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const {
      status,
      priority,
      clientId,
      assignedTo,
      createdBy,
      taskType,
      moduleType,
      dueDateFrom,
      dueDateTo,
      search,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder = 'desc',
    } = req.query;

    const { tasks, total } = await service.getTasks(
      req.user!.organizationId,
      {
        status: status as string,
        priority: priority as string,
        clientId: clientId as string,
        assignedTo: scopedAssignedTo(req, assignedTo),
        createdBy: createdBy as string,
        taskType: taskType as string,
        moduleType: moduleType as string,
        dueDateFrom: dueDateFrom as string,
        dueDateTo: dueDateTo as string,
        search: search as string,
      },
      { page: Number(page), limit: Number(limit), sortBy: sortBy as string, sortOrder: sortOrder as any }
    );

    sendPaginated(res, tasks.map(formatTask), Number(page), Number(limit), total);
  });

  static getTaskById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const task = await service.getTaskById(req.user!.organizationId, req.params.id);
    sendSuccess(res, formatTask(task));
  });

  static updateTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const task = await service.updateTask(req.user!.organizationId, req.user!.userId, req.params.id, req.body);
    sendSuccess(res, formatTask(task), 'Task updated successfully');
  });

  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const result = await service.updateStatus(req.user!.organizationId, req.user!.userId, req.params.id, req.body.status);
    sendSuccess(res, { ...result, status: toApiTaskStatus(result.status) }, 'Task status updated');
  });

  static deleteTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    await service.deleteTask(req.user!.organizationId, req.user!.userId, req.params.id);
    sendSuccess(res, null, 'Task deleted successfully');
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(TaskService);
    const stats = await service.getStats(req.user!.organizationId);
    sendSuccess(res, stats);
  });
}
