import { injectable, inject } from "tsyringe";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class UserService {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository
  ) {}

  async getUsers(organizationId: string, query: any) {
    const { page = 1, limit = 10, role, isActive, search } = query;
    
    const filters = {
      organizationId,
      role,
      isActive,
      search
    };

    const pagination = {
      page: Number(page),
      limit: Number(limit)
    };

    const result = await this.userRepository.findAll(filters, pagination);
    
    return {
      users: result.users.map(u => ({
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        email: u.email,
        createdAt: u.createdAt
      })),
      total: result.total
    };
  }

  async toggleUserStatus(organizationId: string, userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('User not found', 404);
    }

    user.updateStatus(!user.isActive);
    await this.userRepository.save(user);
    
    return { id: user.id, isActive: user.isActive };
  }
}
