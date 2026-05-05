import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { clearAuthToken, getAuthToken } from "./src/services/auth.service";

const STACK_VALUES = ["backend", "frontend"] as const;
const LEVEL_VALUES = ["debug", "info", "warn", "error", "fatal"] as const;
const BACKEND_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
] as const;
const FRONTEND_PACKAGES = [
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
] as const;
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"] as const;
const LOG_API_BASE_URL = "http://20.207.122.201/evaluation-service";
const LOG_API_PATH = "/logs";
const LOG_TIMEOUT_MS = 5000;

const allowedPackagesByStack = {
  backend: [...BACKEND_PACKAGES, ...SHARED_PACKAGES],
  frontend: [...FRONTEND_PACKAGES, ...SHARED_PACKAGES],
} as const;

type Stack = (typeof STACK_VALUES)[number];
type LogLevel = (typeof LEVEL_VALUES)[number];
type AllowedPackage<S extends Stack> = S extends "backend"
  ? (typeof BACKEND_PACKAGES)[number] | (typeof SHARED_PACKAGES)[number]
  : (typeof FRONTEND_PACKAGES)[number] | (typeof SHARED_PACKAGES)[number];

type AuthenticatedRequest = AxiosRequestConfig & {
  _retry?: boolean;
  headers?: unknown;
};

function isOneOf<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

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

function validateLogInput<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackage<S>,
  message: string,
): void {
  if (!isOneOf(stack, STACK_VALUES)) {
    throw new Error(`Invalid stack "${stack}".`);
  }

  if (!isOneOf(level, LEVEL_VALUES)) {
    throw new Error(`Invalid level "${level}".`);
  }

  if (!isOneOf(packageName, allowedPackagesByStack[stack])) {
    throw new Error(`Invalid package "${packageName}" for ${stack}.`);
  }

  if (!message.trim()) {
    throw new Error("Message cannot be empty.");
  }
}

const logClient: AxiosInstance = axios.create({
  baseURL: LOG_API_BASE_URL,
  timeout: LOG_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

logClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  config.headers = withAuthorizationHeader(
    config.headers,
    token,
  ) as typeof config.headers;

  return config;
});

logClient.interceptors.response.use(
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

      return logClient.request(originalRequest as AxiosRequestConfig);
    }

    return Promise.reject(error);
  },
);

export async function Log<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackage<S>,
  message: string,
): Promise<void> {
  try {
    validateLogInput(stack, level, packageName, message);

    await logClient.post(LOG_API_PATH, {
      stack,
      level,
      package: packageName,
      message,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[logging_middleware] ${error.message}`);
      return;
    }

    console.error("[logging_middleware] failed to write log");
  }
}
