import type { Notification } from "../types";

const notifications: Notification[] = [];

export function getAllNotifications(): Notification[] {
  return [...notifications];
}

export function getUnreadNotifications(): Notification[] {
  return notifications.filter((notification) => !notification.isRead);
}

export function addNotification(notification: Notification): Notification {
  notifications.unshift(notification);

  return notification;
}

export function replaceNotifications(items: Notification[]): Notification[] {
  notifications.splice(0, notifications.length, ...items);

  return getAllNotifications();
}

export function markNotificationAsRead(id: string): Notification | null {
  const notification = notifications.find((item) => item.id === id);

  if (!notification) {
    return null;
  }

  notification.isRead = true;

  return notification;
}

export function deleteNotification(id: string): boolean {
  const nextIndex = notifications.findIndex((item) => item.id === id);

  if (nextIndex === -1) {
    return false;
  }

  notifications.splice(nextIndex, 1);

  return true;
}
