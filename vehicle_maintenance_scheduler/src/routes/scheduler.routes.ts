import { Router } from "express";

import { Log } from "../logging_middleware";
import { getSchedule } from "../controllers/scheduler.controller";

export const schedulerRouter = Router();

schedulerRouter.get("/", async (request, response) => {
  await Log("backend", "info", "route", "schedule endpoint called");

  return getSchedule(request, response);
});
