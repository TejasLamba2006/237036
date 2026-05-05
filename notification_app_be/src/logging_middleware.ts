import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { clearAuthToken, getAuthToken } from "./services/auth.service";

const LOG_API_BASE_URL = "http://20.207.122.201/evaluation-service";
const LOG_API_PATH = "/logs";
const LOG_TIMEOUT_MS = 5000;

const stackValues = ["backend", "frontend"] as const;
const levelValues = ["debug", "info", "warn", "error", "fatal"] as const;
const backendPackages = [
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
const frontendPackages = [
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
] as const;
const sharedPackages = ["auth", "config", "middleware", "utils"] as const;

const allowedPackagesByStack = {
  backend: [...backendPackages, ...sharedPackages],
  frontend: [...frontendPackages, ...sharedPackages],
} as const;

type Stack = (typeof stackValues)[number];
type LogLevel = (typeof levelValues)[number];
type AllowedPackage<S extends Stack> = S extends "backend"
  ? (typeof backendPackages)[number] | (typeof sharedPackages)[number]
  : (typeof frontendPackages)[number] | (typeof sharedPackages)[number];

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

function validateInput<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackage<S>,
  message: string,
): void {
  if (!isOneOf(stack, stackValues)) {
    throw new Error(`Invalid stack "${stack}".`);
  }

  if (!isOneOf(level, levelValues)) {
    throw new Error(`Invalid level "${level}".`);
  }

  if (!isOneOf(packageName, allowedPackagesByStack[stack])) {
    throw new Error(`Invalid package "${packageName}" for ${stack}.`);
  }

  if (!message.trim()) {
    throw new Error("Message cannot be empty.");
  }
}

const loggerClient: AxiosInstance = axios.create({
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
  packageName: AllowedPackage<S>,
  message: string,
): Promise<void> {
  try {
    validateInput(stack, level, packageName, message);

    await loggerClient.post(LOG_API_PATH, {
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
