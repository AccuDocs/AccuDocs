import { injectable } from "tsyringe";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";
import { Notification } from "../../domain/entities/Notification";
import { Notification as NotificationModel } from "../../../../models";
import { NotificationMapper } from "../mappers/NotificationMapper";

@injectable()
export class SequelizeNotificationRepository implements INotificationRepository {
  async save(notification: Notification, options?: any): Promise<Notification> {
    const raw = NotificationMapper.toPersistence(notification);
    const exists = await NotificationModel.findByPk(notification.id, { transaction: options?.transaction });

    if (exists) {
      await exists.update(raw, options);
    } else {
      await NotificationModel.create(raw, options);
    }

    const saved = await NotificationModel.findByPk(notification.id, { transaction: options?.transaction });
    return NotificationMapper.toDomain(saved!);
  }

  async findById(id: string, organizationId: string): Promise<Notification | null> {
    const notification = await NotificationModel.findOne({ where: { id, organizationId } });
    if (!notification) return null;
    return NotificationMapper.toDomain(notification);
  }

  async findByUserId(userId: string, organizationId: string, options?: { unreadOnly?: boolean; limit?: number; }): Promise<Notification[]> {
    const where: any = { userId, organizationId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }
    
    const notifications = await NotificationModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options?.limit || 50
    });
    
    return notifications.map(NotificationMapper.toDomain);
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<void> {
    await NotificationModel.update({ isRead: true }, {
      where: { userId, organizationId, isRead: false }
    });
  }
}
