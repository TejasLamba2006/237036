import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { LOG_API_BASE_URL, LOG_API_PATH, LOG_TIMEOUT_MS } from "./constants";
import type { AllowedPackageForStack, LogLevel, Stack } from "./types";
import { clearAuthToken, getAuthToken } from "./services/auth.service";
import { reportInternalError } from "./utils";
import { validateLogInput } from "./validator";

type AuthenticatedRequest = AxiosRequestConfig & {
  _retry?: boolean;
  headers?: unknown;
};

function withAuthorizationHeader(headers: unknown, token: string): unknown {
  if (headers && typeof (headers as { set?: unknown }).set === "function") {
    (headers as { set: (name: string, value: string) => void }).set(
      "Authorization",
      token,
    );
    return headers;
  }

  return {
    ...(headers as Record<string, unknown>),
    Authorization: token,
  };
}

export const loggerClient: AxiosInstance = axios.create({
  baseURL: LOG_API_BASE_URL,
  timeout: LOG_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

loggerClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  config.headers = withAuthorizationHeader(
    config.headers,
    token,
  ) as typeof config.headers;

  return config;
});

loggerClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AuthenticatedRequest | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      clearAuthToken();

      const token = await getAuthToken();
      originalRequest.headers = withAuthorizationHeader(
        originalRequest.headers,
        token,
      ) as AxiosRequestConfig["headers"];

      return loggerClient.request(originalRequest as AxiosRequestConfig);
    }

    return Promise.reject(error);
  },
);

export async function Log<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackageForStack<S>,
  message: string,
): Promise<void> {
  try {
    const payload = validateLogInput(stack, level, packageName, message);

    await loggerClient.post(LOG_API_PATH, payload);
  } catch (error) {
    reportInternalError("Logging request failed.", error);
  }
}
