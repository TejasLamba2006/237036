import { Log } from "../logging_middleware";
import { apiClient } from "../config/axios";
import type { Depot, DepotsResponse } from "../types";

export async function fetchDepots(): Promise<Depot[]> {
  const response = await apiClient.get<DepotsResponse>("/depots");

  await Log("backend", "info", "service", "depots fetched");

  return response.data.depots;
}
