import { Notification } from "../../domain/entities/Notification";

export class NotificationMapper {
  public static toDomain(raw: any): Notification {
    const props = {
      organizationId: raw.organizationId,
      userId: raw.userId,
      type: raw.type,
      title: raw.title,
      message: raw.message,
      isRead: raw.isRead,
      metadata: raw.metadata,
      createdAt: raw.createdAt
    };
    return Notification.create(props, raw.id).getValue();
  }

  public static toPersistence(notification: Notification): any {
    return {
      id: notification.id,
      organizationId: notification.organizationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metadata: notification.metadata
    };
  }
}
