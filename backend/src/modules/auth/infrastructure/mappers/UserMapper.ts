
import { User } from "../../domain/entities/User";
import { User as UserPersistence } from "../../../../models";

export class UserMapper {
  public static toDomain(raw: any): User | null {
    if (!raw) return null;

    // Convert Sequelize instance to POJO if needed
    const data = raw.toJSON ? raw.toJSON() : raw;

    const userOrError = User.create({
      organizationId: data.organizationId,
      name: data.name,
      mobile: data.mobile,
      password: data.password,
      role: data.role,
      isActive: data.isActive,
      lastLoginAt: data.lastLogin ? new Date(data.lastLogin) : null
    }, data.id);

    return userOrError.isSuccess ? userOrError.getValue() : null;
  }

  public static toPersistence(user: User): any {
    return {
      id: user.id,
      name: user.props.name,
      mobile: user.props.mobile,
      password: user.props.password,
      role: user.props.role,
      isActive: user.props.isActive,
      lastLoginAt: user.props.lastLoginAt
    };
  }
}
