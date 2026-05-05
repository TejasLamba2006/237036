export type NotificationType = "Placement" | "Result" | "Event";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface CreateNotificationInput {
  type: NotificationType;
  message: string;
}

export interface ExternalNotification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface ExternalNotificationsResponse {
  notifications: ExternalNotification[];
}

export interface NotificationResponseBody {
  success: true;
  data: Notification[];
}

export interface NotificationMessageResponse {
  success: true;
  message: string;
}

export interface NotificationErrorResponse {
  success: false;
  message: string;
}
