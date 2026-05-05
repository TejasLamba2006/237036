import type { Request, Response } from "express";

import { Log } from "../logging_middleware";
import type {
  CreateNotificationInput,
  NotificationErrorResponse,
  NotificationMessageResponse,
  NotificationResponseBody,
  NotificationType,
} from "../types";
import {
  createNotification,
  listNotifications,
  listUnreadNotifications,
  markAsRead,
  removeNotification,
  syncNotifications,
} from "../services/notification.service";

function isNotificationType(value: unknown): value is NotificationType {
  return value === "Placement" || value === "Result" || value === "Event";
}

function buildFailureResponse(message: string): NotificationErrorResponse {
  return {
    success: false,
    message,
  };
}

export async function getNotifications(
  _request: Request,
  response: Response<NotificationResponseBody | NotificationErrorResponse>,
): Promise<Response<NotificationResponseBody | NotificationErrorResponse>> {
  try {
    const data = await listNotifications();

    return response.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to fetch notifications"));
  }
}

export async function getUnreadNotificationsHandler(
  _request: Request,
  response: Response<NotificationResponseBody | NotificationErrorResponse>,
): Promise<Response<NotificationResponseBody | NotificationErrorResponse>> {
  try {
    const data = await listUnreadNotifications();

    return response.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to fetch unread notifications"));
  }
}

export async function postNotification(
  request: Request<
    unknown,
    NotificationResponseBody | NotificationErrorResponse,
    CreateNotificationInput
  >,
  response: Response<NotificationResponseBody | NotificationErrorResponse>,
): Promise<Response<NotificationResponseBody | NotificationErrorResponse>> {
  try {
    const { type, message } = request.body;

    if (
      !isNotificationType(type) ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return response
        .status(400)
        .json(buildFailureResponse("Invalid notification payload"));
    }

    const created = await createNotification({ type, message: message.trim() });

    await Log("backend", "info", "controller", "notification created");

    return response.status(201).json({
      success: true,
      data: [created],
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to create notification"));
  }
}

export async function patchNotificationRead(
  request: Request<{ id: string }>,
  response: Response<NotificationMessageResponse | NotificationErrorResponse>,
): Promise<Response<NotificationMessageResponse | NotificationErrorResponse>> {
  try {
    const updated = await markAsRead(request.params.id);

    if (!updated) {
      return response
        .status(404)
        .json(buildFailureResponse("Notification not found"));
    }

    await Log("backend", "info", "controller", "notification marked as read");

    return response.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to mark notification as read"));
  }
}

export async function deleteNotificationHandler(
  request: Request<{ id: string }>,
  response: Response<NotificationMessageResponse | NotificationErrorResponse>,
): Promise<Response<NotificationMessageResponse | NotificationErrorResponse>> {
  try {
    const deleted = await removeNotification(request.params.id);

    if (!deleted) {
      return response
        .status(404)
        .json(buildFailureResponse("Notification not found"));
    }

    await Log("backend", "warn", "controller", "notification deleted");

    return response.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to delete notification"));
  }
}

export async function syncNotificationHandler(
  _request: Request,
  response: Response<NotificationResponseBody | NotificationErrorResponse>,
): Promise<Response<NotificationResponseBody | NotificationErrorResponse>> {
  try {
    await Log("backend", "info", "service", "sync started");

    const data = await syncNotifications();

    await Log("backend", "info", "service", "notifications synced");

    return response.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "notification operation failed");

    return response
      .status(500)
      .json(buildFailureResponse("Failed to sync notifications"));
  }
}
