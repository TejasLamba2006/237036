import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { clearAuthToken, getAuthToken } from "../services/auth.service";

export const API_BASE_URL = "http://20.207.122.201/evaluation-service";
export const API_TIMEOUT_MS = 5000;

type AuthenticatedRequest = AxiosRequestConfig & {
  _retry?: boolean;
  headers?: unknown;
};

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

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  config.headers = withAuthorizationHeader(
    config.headers,
    token,
  ) as typeof config.headers;

  return config;
});

apiClient.interceptors.response.use(
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

      return apiClient.request(originalRequest as AxiosRequestConfig);
    }

    return Promise.reject(error);
  },
);
