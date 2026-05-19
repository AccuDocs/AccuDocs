import { injectable } from "tsyringe";
import { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { Task } from "../../domain/entities/Task";
import { Task as TaskModel, User as UserModel, Client as ClientModel } from "../../../../models";
import { TaskMapper } from "../mappers/TaskMapper";
import { Op } from "sequelize";

const normalizeStatusFilter = (status: string) => {
  switch (status) {
    case 'in-progress':
    case 'in_progress':
      return ['in_progress', 'in-progress'];
    case 'pending':
    case 'todo':
      return ['pending', 'todo'];
    case 'completed':
    case 'done':
      return ['completed', 'done'];
    default:
      return status;
  }
};

const allowedSortFields = new Set([
  'createdAt',
  'updatedAt',
  'dueDate',
  'startDate',
  'priority',
  'status',
  'title',
  'taskType',
  'moduleType',
]);

@injectable()
export class SequelizeTaskRepository implements ITaskRepository {
  async save(task: Task, options?: any): Promise<Task> {
    const raw = TaskMapper.toPersistence(task);
    const exists = await TaskModel.findByPk(task.id, { transaction: options?.transaction });

    if (exists) {
      await exists.update(raw, options);
    } else {
      await TaskModel.create(raw, options);
    }

    const saved = await TaskModel.findByPk(task.id, { transaction: options?.transaction });
    return TaskMapper.toDomain(saved!);
  }

  async findById(id: string, organizationId: string): Promise<Task | null> {
    const task = await TaskModel.findOne({
      where: { id, organizationId },
      include: [
        { model: UserModel, as: 'assignee', attributes: ['id', 'name', 'email', 'role'], required: false },
        { model: UserModel, as: 'creator', attributes: ['id', 'name', 'email', 'role'], required: false },
        { model: ClientModel, as: 'client', attributes: ['id', 'code', 'name'], required: false },
      ],
    });
    if (!task) return null;
    return TaskMapper.toDomain(task);
  }

  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ tasks: Task[], total: number }> {
    const where: any = { organizationId };

    if (filters.status) {
      const normalizedStatus = normalizeStatusFilter(filters.status);
      where.status = Array.isArray(normalizedStatus) ? { [Op.in]: normalizedStatus } : normalizedStatus;
    }
    if (filters.priority) where.priority = filters.priority;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.taskType) where.taskType = filters.taskType;
    if (filters.moduleType) where.moduleType = filters.moduleType;
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate[Op.gte] = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) where.dueDate[Op.lte] = new Date(filters.dueDateTo);
    }
    
    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } },
        { taskType: { [Op.like]: `%${filters.search}%` } },
        { moduleType: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const sortBy = allowedSortFields.has(pagination.sortBy) ? pagination.sortBy : 'createdAt';
    const order: any = pagination.sortBy
      ? [[sortBy, pagination.sortOrder || 'desc']]
      : [['createdAt', 'desc']];

    const { rows, count } = await TaskModel.findAndCountAll({
      where,
      offset,
      limit: pagination.limit,
      order,
      distinct: true,
      include: [
        { model: UserModel, as: 'assignee', attributes: ['id', 'name', 'email', 'role'], required: false },
        { model: UserModel, as: 'creator', attributes: ['id', 'name', 'email', 'role'], required: false },
        { model: ClientModel, as: 'client', attributes: ['id', 'code', 'name'], required: false },
      ],
    });

    return { 
      tasks: rows.map(r => TaskMapper.toDomain(r)), 
      total: count 
    };
  }

  async delete(id: string, organizationId: string, options?: any): Promise<void> {
    await TaskModel.destroy({ where: { id, organizationId }, transaction: options?.transaction });
  }
}
