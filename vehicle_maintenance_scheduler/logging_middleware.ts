import axios from "axios";

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

const logClient = axios.create({
  baseURL: LOG_API_BASE_URL,
  timeout: LOG_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

type Stack = (typeof STACK_VALUES)[number];
type LogLevel = (typeof LEVEL_VALUES)[number];
type AllowedPackage<S extends Stack> = S extends "backend"
  ? (typeof BACKEND_PACKAGES)[number] | (typeof SHARED_PACKAGES)[number]
  : (typeof FRONTEND_PACKAGES)[number] | (typeof SHARED_PACKAGES)[number];

function isOneOf<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

function getToken(): string | null {
  const token = process.env.LOG_TOKEN?.trim();

  return token || null;
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

export async function Log<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackage<S>,
  message: string,
): Promise<void> {
  try {
    validateLogInput(stack, level, packageName, message);

    const token = getToken();

    if (!token) {
      console.error(
        "[logging_middleware] Logging skipped because LOG_TOKEN is missing.",
      );
      return;
    }

    await logClient.post(
      LOG_API_PATH,
      {
        stack,
        level,
        package: packageName,
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[logging_middleware] ${error.message}`);
      return;
    }

    console.error("[logging_middleware] failed to write log");
  }
}
