import { injectable, inject } from "tsyringe";
import { INotificationRepository } from "../../domain/repositories/INotificationRepository";
import { Notification } from "../../domain/entities/Notification";
import { AppError, NotFoundError } from "../../../../utils/errors";

@injectable()
export class NotificationService {
  constructor(
    @inject("INotificationRepository") private notificationRepo: INotificationRepository
  ) {}

  async createNotification(organizationId: string, userId: string, data: any) {
    const props = {
      organizationId,
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
      metadata: data.metadata || {}
    };

    const result = Notification.create(props);
    if (result.isFailure) throw new AppError(result.getError() as string, 500);

    const saved = await this.notificationRepo.save(result.getValue());

    // Basic real-time integration hook points
    // socketService.emitToUser(userId, 'new_notification', saved);
    
    return saved;
  }

  async getUserNotifications(organizationId: string, userId: string, unreadOnly: boolean = false) {
    const notifications = await this.notificationRepo.findByUserId(userId, organizationId, { unreadOnly, limit: 100 });
    return notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      metadata: n.metadata,
      createdAt: n.createdAt
    }));
  }

  async markAsRead(organizationId: string, userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findById(notificationId, organizationId);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    (notification as any).props.isRead = true;
    const saved = await this.notificationRepo.save(notification);
    return { id: saved.id, isRead: saved.isRead };
  }

  async markAllAsRead(organizationId: string, userId: string) {
    await this.notificationRepo.markAllAsRead(userId, organizationId);
    return { success: true };
  }
}
