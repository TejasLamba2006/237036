import axios, { type AxiosInstance } from "axios";

import { LOG_API_BASE_URL, LOG_API_PATH, LOG_TIMEOUT_MS } from "./constants";
import type { AllowedPackageForStack, LogLevel, Stack } from "./types";
import { getLogToken, reportInternalError } from "./utils";
import { validateLogInput } from "./validator";

export const loggerClient: AxiosInstance = axios.create({
  baseURL: LOG_API_BASE_URL,
  timeout: LOG_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

async function sendLogRequest<S extends Stack>(
  payload: { stack: S; level: LogLevel; package: AllowedPackageForStack<S>; message: string },
  token: string,
): Promise<void> {
  await loggerClient.post(LOG_API_PATH, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function Log<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackageForStack<S>,
  message: string,
): Promise<void> {
  const payload = validateLogInput(stack, level, packageName, message);
  const token = getLogToken();

  if (!token) {
    reportInternalError("Logging skipped because LOG_TOKEN is missing.");
    return;
  }

  try {
    await sendLogRequest(payload, token);
  } catch (error) {
    reportInternalError("Logging request failed.", error);
  }
}