import axios from "axios";

import {
  ALLOWED_PACKAGES_BY_STACK,
  LEVEL_VALUES,
  STACK_VALUES,
} from "./constants";
import type { AllowedPackageForStack, LogLevel, Stack } from "./types";

declare const process: {
  env: Record<string, string | undefined>;
};

declare const console: {
  error: (...args: unknown[]) => void;
};

export function isOneOf<T extends string>(
  value: string,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

export function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

export function getLogToken(): string | null {
  const token = process.env.LOG_TOKEN?.trim();

  return token || null;
}

export function describeFailure(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const responseBody = formatResponseBody(error.response?.data);

    const parts = ["request failed"];

    if (status) {
      parts.push(`(${status}${statusText ? ` ${statusText}` : ""})`);
    }

    if (error.message) {
      parts.push(`- ${error.message}`);
    }

    if (responseBody) {
      parts.push(`| ${responseBody}`);
    }

    return parts.join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}

export function reportInternalError(message: string, error?: unknown): void {
  if (error === undefined) {
    console.error(`[logging_middleware] ${message}`);
    return;
  }

  console.error(`[logging_middleware] ${message} ${describeFailure(error)}`);
}

function formatResponseBody(body: unknown): string {
  if (body === null || body === undefined) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  if (typeof body === "object") {
    const maybeMessage = (body as { message?: unknown }).message;

    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }

    try {
      return JSON.stringify(body);
    } catch {
      return "";
    }
  }

  return "";
}

export function getAllowedPackagesForStack<S extends Stack>(
  stack: S,
): readonly AllowedPackageForStack<S>[] {
  return ALLOWED_PACKAGES_BY_STACK[
    stack
  ] as readonly AllowedPackageForStack<S>[];
}

export function isValidStack(value: string): value is Stack {
  return isOneOf(value, STACK_VALUES);
}

export function isValidLevel(value: string): value is LogLevel {
  return isOneOf(value, LEVEL_VALUES);
}
