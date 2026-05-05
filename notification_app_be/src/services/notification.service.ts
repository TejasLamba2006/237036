import { Log } from "../logging_middleware";
import type { CreateNotificationInput, Notification } from "../types";
import {
  addNotification,
  deleteNotification,
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  replaceNotifications,
} from "../store/memory.store";
import { fetchExternalNotifications } from "./external.service";

function buildId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listNotifications(): Promise<Notification[]> {
  return getAllNotifications();
}

export async function listUnreadNotifications(): Promise<Notification[]> {
  return getUnreadNotifications();
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const notification: Notification = {
    id: buildId(),
    type: input.type,
    message: input.message,
    timestamp: new Date(),
    isRead: false,
  };

  return addNotification(notification);
}

export async function markAsRead(id: string): Promise<Notification | null> {
  return markNotificationAsRead(id);
}

export async function removeNotification(id: string): Promise<boolean> {
  return deleteNotification(id);
}

export async function syncNotifications(): Promise<Notification[]> {
  const externalNotifications = await fetchExternalNotifications();

  const currentNotifications = getAllNotifications();
  const merged = [...externalNotifications];

  for (const notification of currentNotifications) {
    if (merged.some((item) => item.id === notification.id)) {
      continue;
    }

    merged.push(notification);
  }

  return replaceNotifications(merged);
}
