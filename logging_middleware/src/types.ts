import { BACKEND_PACKAGES, FRONTEND_PACKAGES, LEVEL_VALUES, SHARED_PACKAGES, STACK_VALUES } from "./constants";

export type Stack = (typeof STACK_VALUES)[number];

export type LogLevel = (typeof LEVEL_VALUES)[number];

export type BackendPackage = (typeof BACKEND_PACKAGES)[number];

export type FrontendPackage = (typeof FRONTEND_PACKAGES)[number];

export type SharedPackage = (typeof SHARED_PACKAGES)[number];

export type AllowedPackage = BackendPackage | FrontendPackage | SharedPackage;

export type AllowedPackageForStack<S extends Stack> = S extends "backend"
  ? BackendPackage | SharedPackage
  : FrontendPackage | SharedPackage;

export interface LogRequestBody<S extends Stack = Stack> {
  stack: S;
  level: LogLevel;
  package: AllowedPackageForStack<S>;
  message: string;
}