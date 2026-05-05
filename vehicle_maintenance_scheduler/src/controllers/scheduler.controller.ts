import type { Request, Response } from "express";

import { Log } from "../logging_middleware";
import type { ScheduleErrorResponse, ScheduleSuccessResponse } from "../types";
import { generateSchedule } from "../services/scheduler.service";

export async function getSchedule(
  _request: Request,
  response: Response<ScheduleSuccessResponse | ScheduleErrorResponse>,
): Promise<Response<ScheduleSuccessResponse | ScheduleErrorResponse>> {
  try {
    await Log("backend", "info", "controller", "starting schedule generation");

    const data = await generateSchedule();

    return response.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    await Log("backend", "error", "handler", "failed to generate schedule");
    console.error("Failed to generate maintenance schedule", error);

    return response.status(500).json({
      success: false,
      message: "Failed to generate maintenance schedule",
    });
  }
}
