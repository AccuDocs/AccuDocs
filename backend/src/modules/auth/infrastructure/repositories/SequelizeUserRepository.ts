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

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await UserModel.update({ lastLoginAt: date }, { where: { id } });
  }

  async save(user: User): Promise<User> {
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

    if (user.id) {
      const [_, updated] = await UserModel.update(data, {
        where: { id: user.id },
        returning: true
      });
      if (!updated || updated.length === 0) {
        throw new Error('User not found for update');
      }
      return this.toEntity(updated[0]);
    } else {
      const created = await UserModel.create(data);
      return this.toEntity(created);
    }
  }
}
