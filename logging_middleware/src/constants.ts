export const STACK_VALUES = ["backend", "frontend"] as const;

export const LEVEL_VALUES = ["debug", "info", "warn", "error", "fatal"] as const;

export const BACKEND_PACKAGES = [
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

export const FRONTEND_PACKAGES = ["api", "component", "hook", "page", "state", "style"] as const;

export const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"] as const;

export const ALLOWED_PACKAGES_BY_STACK = {
  backend: [...BACKEND_PACKAGES, ...SHARED_PACKAGES],
  frontend: [...FRONTEND_PACKAGES, ...SHARED_PACKAGES],
} as const;

export const LOG_API_BASE_URL = "http://20.207.122.201/evaluation-service";

export const LOG_API_PATH = "/logs";

export const LOG_TIMEOUT_MS = 5_000;