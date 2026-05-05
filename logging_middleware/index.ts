import "dotenv/config";
export { Log } from "./src";
export type {
  AllowedPackage,
  AllowedPackageForStack,
  BackendPackage,
  FrontendPackage,
  LogLevel,
  LogRequestBody,
  SharedPackage,
  Stack,
} from "./src";
export {
  ALLOWED_PACKAGES_BY_STACK,
  BACKEND_PACKAGES,
  FRONTEND_PACKAGES,
  LEVEL_VALUES,
  LOG_API_BASE_URL,
  LOG_API_PATH,
  LOG_TIMEOUT_MS,
  SHARED_PACKAGES,
  STACK_VALUES,
} from "./src";

/*
exmaple:
await Log("backend", "info", "service", "Vehicle data fetched successfully");
*/
