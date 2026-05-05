import { ALLOWED_PACKAGES_BY_STACK, LEVEL_VALUES, STACK_VALUES } from "./constants";
import type { AllowedPackageForStack, LogLevel, LogRequestBody, Stack } from "./types";
import { isNonEmptyText, isOneOf } from "./utils";

function validationError(message: string): Error {
  const error = new Error(message);

  error.name = "LogValidationError";

  return error;
}

function fail(message: string): never {
  throw validationError(message);
}

export function validateStack(stack: string): void {
  if (!isOneOf(stack, STACK_VALUES)) {
    fail(`Invalid stack "${stack}". Expected backend or frontend.`);
  }
}

export function validateLevel(level: string): void {
  if (!isOneOf(level, LEVEL_VALUES)) {
    fail(`Invalid level "${level}". Expected debug, info, warn, error or fatal.`);
  }
}

export function validatePackage<S extends Stack>(stack: S, packageName: string): void {
  const allowedPackages = ALLOWED_PACKAGES_BY_STACK[stack];

  if (!isOneOf(packageName, allowedPackages)) {
    fail(`Invalid package "${packageName}" for ${stack}. Allowed values: ${allowedPackages.join(", ")}.`);
  }
}

export function validateMessage(message: string): void {
  if (!isNonEmptyText(message)) {
    fail("Message cannot be empty.");
  }
}

export function validateLogInput<S extends Stack>(
  stack: S,
  level: LogLevel,
  packageName: AllowedPackageForStack<S>,
  message: string,
): LogRequestBody<S> {
  validateStack(stack);
  validateLevel(level);
  validatePackage(stack, packageName);
  validateMessage(message);

  return {
    stack,
    level,
    package: packageName,
    message,
  };
}