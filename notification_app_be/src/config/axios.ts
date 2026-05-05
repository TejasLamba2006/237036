import axios, { type AxiosInstance } from "axios";

export const API_BASE_URL = "http://20.207.122.201/evaluation-service";
export const API_TIMEOUT_MS = 5000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getAuthHeaders(): Record<string, string> {
  const token = process.env.LOG_TOKEN?.trim();

  if (!token) {
    throw new Error("Missing LOG_TOKEN");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
