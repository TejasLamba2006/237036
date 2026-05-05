import axios from "axios";

const AUTH_API_BASE_URL = "http://20.207.122.201/evaluation-service";
const AUTH_API_PATH = "/auth";
const AUTH_TIMEOUT_MS = 5000;

declare const process: {
  env: Record<string, string | undefined>;
};

interface AuthResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
}

const authClient = axios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: AUTH_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

let cachedToken = "";
let tokenExpiresAt = 0;
let tokenRequest: Promise<string> | null = null;

function getRequiredEnv(
  name:
    | "NAME"
    | "EMAIL"
    | "ROLL_NO"
    | "ACCESS_CODE"
    | "CLIENT_ID"
    | "CLIENT_SECRET",
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing auth env var: ${name}`);
  }

  return value;
}

function buildAuthBody() {
  return {
    name: getRequiredEnv("NAME"),
    email: getRequiredEnv("EMAIL"),
    rollNo: getRequiredEnv("ROLL_NO"),
    accessCode: getRequiredEnv("ACCESS_CODE"),
    clientID: getRequiredEnv("CLIENT_ID"),
    clientSecret: getRequiredEnv("CLIENT_SECRET"),
  };
}

async function requestAuthToken(): Promise<string> {
  const response = await authClient.post<AuthResponse>(
    AUTH_API_PATH,
    buildAuthBody(),
  );
  const tokenType = response.data.token_type?.trim() || "Bearer";
  const accessToken = response.data.access_token?.trim();

  if (!accessToken) {
    throw new Error("Auth service returned an empty token");
  }

  cachedToken = `${tokenType} ${accessToken}`;
  tokenExpiresAt =
    Date.now() + Math.max(response.data.expires_in ?? 0, 0) * 1000;

  return cachedToken;
}

export async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!tokenRequest) {
    tokenRequest = requestAuthToken().finally(() => {
      tokenRequest = null;
    });
  }

  return tokenRequest;
}

export function clearAuthToken(): void {
  cachedToken = "";
  tokenExpiresAt = 0;
  tokenRequest = null;
}
