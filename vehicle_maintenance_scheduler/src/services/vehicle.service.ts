import { Log } from "../logging_middleware";
import { apiClient } from "../config/axios";
import type { Vehicle, VehiclesResponse } from "../types";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const response = await apiClient.get<VehiclesResponse>("/vehicles");

  await Log("backend", "info", "service", "vehicles fetched");

  return response.data.vehicles;
}
