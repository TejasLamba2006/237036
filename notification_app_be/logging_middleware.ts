import axios from "axios";

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

const loggerClient = axios.create({
  baseURL: LOG_API_BASE_URL,
  timeout: LOG_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

type Stack = (typeof stackValues)[number];
type LogLevel = (typeof levelValues)[number];
type AllowedPackage<S extends Stack> = S extends "backend"
  ? (typeof backendPackages)[number] | (typeof sharedPackages)[number]
  : (typeof frontendPackages)[number] | (typeof sharedPackages)[number];

function isOneOf<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
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

export async function Log<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackage<S>,
  message: string,
): Promise<void> {
  try {
    validateInput(stack, level, packageName, message);

    const token = process.env.LOG_TOKEN?.trim();

    if (!token) {
      console.error(
        "[logging_middleware] Logging skipped because LOG_TOKEN is missing.",
      );
      return;
    }

    await loggerClient.post(
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
