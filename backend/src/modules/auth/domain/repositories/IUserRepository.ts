import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByMobileAndOrg(mobile: string, organizationId?: string): Promise<User | null>;
  findByMobile(mobile: string): Promise<User[]>;
  updateLastLogin(id: string, date: Date): Promise<void>;
  findAll(filters: any, pagination: any): Promise<{ users: User[], total: number }>;
  save(user: User): Promise<User>;
}
