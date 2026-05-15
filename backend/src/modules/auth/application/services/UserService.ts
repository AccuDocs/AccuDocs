import { injectable, inject } from "tsyringe";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { AppError } from "../../../../utils/errors";
import bcrypt from 'bcryptjs';
import { User } from "../../domain/entities/User";

@injectable()
export class UserService {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository
  ) {}

  async getUsers(organizationId: string, query: any) {
    const { page = 1, limit = 10, role, excludeRole, isActive, search } = query;
    
    const filters = {
      organizationId,
      role,
      excludeRole,
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

  async getUser(organizationId: string, userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      email: user.email,
      createdAt: user.createdAt
    };
  }

  async createUser(organizationId: string, data: any) {
    const existing = await this.userRepository.findByMobileAndOrg(data.mobile, organizationId);
    if (existing) {
      throw new AppError('A user with this mobile number already exists', 409);
    }

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;
    const userOrError = User.create({
      organizationId,
      name: data.name,
      mobile: data.mobile,
      role: data.role ?? 'staff',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      lastLoginAt: null,
      password: hashedPassword,
      email: data.email ?? null,
      preferences: {},
    });

    if (userOrError.isFailure) {
      throw new AppError(userOrError.getError() as string, 400);
    }

    const user = await this.userRepository.save(userOrError.getValue());
    return this.getUser(organizationId, user.id);
  }

  async updateUser(organizationId: string, userId: string, data: any) {
    const existing = await this.userRepository.findById(userId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new AppError('User not found', 404);
    }

    if (data.mobile && data.mobile !== existing.mobile) {
      const duplicate = await this.userRepository.findByMobileAndOrg(data.mobile, organizationId);
      if (duplicate && duplicate.id !== userId) {
        throw new AppError('A user with this mobile number already exists', 409);
      }
    }

    const password = data.password ? await bcrypt.hash(data.password, 10) : existing.password;
    const userOrError = User.create({
      organizationId,
      name: data.name ?? existing.name,
      mobile: data.mobile ?? existing.mobile,
      role: data.role ?? existing.role as any,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
      lastLoginAt: existing.lastLoginAt,
      password,
      email: data.email !== undefined ? data.email : existing.email,
      avatarS3Key: existing.avatarS3Key,
      preferences: existing.preferences,
    }, existing.id);

    if (userOrError.isFailure) {
      throw new AppError(userOrError.getError() as string, 400);
    }

    const user = await this.userRepository.save(userOrError.getValue());
    return this.getUser(organizationId, user.id);
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
