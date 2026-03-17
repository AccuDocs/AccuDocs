import { Notification } from "../entities/Notification";

export interface INotificationRepository {
  save(notification: Notification, options?: any): Promise<Notification>;
  findById(id: string, organizationId: string): Promise<Notification | null>;
  findByUserId(userId: string, organizationId: string, options?: { unreadOnly?: boolean, limit?: number }): Promise<Notification[]>;
  markAllAsRead(userId: string, organizationId: string): Promise<void>;
}
