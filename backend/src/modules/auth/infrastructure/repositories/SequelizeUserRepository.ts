import { injectable } from 'tsyringe';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { User as UserModel } from '../../../../models';

@injectable()
export class SequelizeUserRepository implements IUserRepository {
  private toEntity(model: UserModel): User {
    const props = {
      organizationId: model.getDataValue('organizationId'),
      name: model.getDataValue('name'),
      mobile: model.getDataValue('mobile'),
      role: model.getDataValue('role') as any,
      isActive: model.getDataValue('isActive'),
      lastLoginAt: model.getDataValue('lastLoginAt'),
      password: model.getDataValue('password'),
      email: model.getDataValue('email'),
      avatarS3Key: model.getDataValue('avatarS3Key'),
      preferences: model.getDataValue('preferences'),
      createdAt: model.getDataValue('createdAt'),
      updatedAt: model.getDataValue('updatedAt')
    };
    return User.create(props, model.getDataValue('id')).getValue();
  }

  async findById(id: string): Promise<User | null> {
    const model = await UserModel.findByPk(id);
    return model ? this.toEntity(model) : null;
  }

  async findByMobileAndOrg(mobile: string, organizationId?: string): Promise<User | null> {
    const where: any = { mobile };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const model = await UserModel.findOne({ where });
    return model ? this.toEntity(model) : null;
  }

  async findByMobile(mobile: string): Promise<User[]> {
    const models = await UserModel.findAll({ where: { mobile } });
    return models.map(m => this.toEntity(m));
  }

  async findByIdentifier(identifier: string): Promise<User[]> {
    const { Op } = require('sequelize');
    const models = await UserModel.findAll({
      where: {
        [Op.or]: [
          { mobile: identifier },
          { email: identifier }
        ]
      }
    });
    return models.map(m => this.toEntity(m));
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await UserModel.update({ lastLoginAt: date }, { where: { id } });
  }

  async findAll(filters: any, pagination: any): Promise<{ users: User[], total: number }> {
    const where: any = {};
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.role) where.role = filters.role;
    if (filters.excludeRole && !filters.role) {
      const { Op } = require('sequelize');
      where.role = { [Op.ne]: filters.excludeRole };
    }
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    // Search by name or mobile if provided in filters.q or similar
    if (filters.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { mobile: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const { rows, count } = await UserModel.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
      order: [['createdAt', 'DESC']]
    });

    return {
      users: rows.map(r => this.toEntity(r)),
      total: count
    };
  }

  async save(user: User, options?: { transaction?: any }): Promise<User> {
    const data = {
      organizationId: user.organizationId,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      password: user.password,
      email: user.email,
      avatarS3Key: user.avatarS3Key,
      preferences: user.preferences
    };
    
    // In this user logic, since we handle both update and create,
    // we must check for existence using the ID.
    const exists = await UserModel.findByPk(user.id, { transaction: options?.transaction });
    if (exists) {
      const [_, updated] = await UserModel.update(data, {
        where: { id: user.id },
        returning: true,
        transaction: options?.transaction
      });
      if (!updated || updated.length === 0) {
        throw new Error('User not found for update');
      }
      return this.toEntity(updated[0]);
    } else {
      const created = await UserModel.create({ ...data, id: user.id }, { transaction: options?.transaction });
      return this.toEntity(created);
    }
  }
}
