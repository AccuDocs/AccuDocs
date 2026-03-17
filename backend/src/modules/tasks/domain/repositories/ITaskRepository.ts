import { Task } from "../entities/Task";

export interface ITaskRepository {
  save(task: Task, options?: any): Promise<Task>;
  findById(id: string, organizationId: string): Promise<Task | null>;
  findAll(organizationId: string, filters: any, pagination: any): Promise<{ tasks: Task[], total: number }>;
  delete(id: string, organizationId: string, options?: any): Promise<void>;
}
