import { injectable } from "tsyringe";
import { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { Task } from "../../domain/entities/Task";
import { Task as TaskModel, User as UserModel, Client as ClientModel } from "../../../../models";
import { TaskMapper } from "../mappers/TaskMapper";
import { Op } from "sequelize";

const normalizeStatusFilter = (status: string) => {
  switch (status) {
    case 'in-progress':
      return 'in_progress';
    case 'pending':
      return 'todo';
    case 'completed':
      return 'done';
    default:
      return status;
  }
};

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
    const task = await TaskModel.findOne({ where: { id, organizationId } });
    if (!task) return null;
    return TaskMapper.toDomain(task);
  }

  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ tasks: Task[], total: number }> {
    const where: any = { organizationId };

    if (filters.status) where.status = normalizeStatusFilter(filters.status);
    if (filters.priority) where.priority = filters.priority;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    
    // Quick search by title
    if (filters.search) {
      where.title = { [Op.like]: `%${filters.search}%` };
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const order: any = pagination.sortBy
      ? [[pagination.sortBy, pagination.sortOrder || 'desc']]
      : [['createdAt', 'desc']];

    const { rows, count } = await TaskModel.findAndCountAll({
      where,
      offset,
      limit: pagination.limit,
      order,
      // If we wanted to include joined entity relations, we could do it here
      // include: [
      //   { model: UserModel, as: 'Assignee', attributes: ['id', 'name'] },
      //   { model: ClientModel, as: 'Client', attributes: ['id', 'name'] }
      // ]
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
