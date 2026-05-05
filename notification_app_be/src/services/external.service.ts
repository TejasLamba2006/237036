import { apiClient } from "../config/axios";
import type { ExternalNotificationsResponse, Notification } from "../types";

export async function fetchExternalNotifications(): Promise<Notification[]> {
  const response =
    await apiClient.get<ExternalNotificationsResponse>("/notifications");

  return response.data.notifications.map((item) => ({
    id: item.ID,
    type: item.Type,
    message: item.Message,
    timestamp: new Date(item.Timestamp),
    isRead: false,
  }));
}
