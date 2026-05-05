import { Router } from "express";

import { Log } from "../logging_middleware";
import {
  deleteNotificationHandler,
  getNotifications,
  getUnreadNotificationsHandler,
  patchNotificationRead,
  postNotification,
  syncNotificationHandler,
} from "../controllers/notification.controller";

export const notificationRouter = Router();

notificationRouter.use(async (_request, _response, next) => {
  await Log("backend", "info", "route", "notification route hit");
  next();
});

notificationRouter.get("/", getNotifications);
notificationRouter.get("/unread", getUnreadNotificationsHandler);
notificationRouter.post("/", postNotification);
notificationRouter.patch("/:id/read", patchNotificationRead);
notificationRouter.delete("/:id", deleteNotificationHandler);
notificationRouter.post("/sync", syncNotificationHandler);
