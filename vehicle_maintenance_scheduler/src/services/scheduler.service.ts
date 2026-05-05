import { Log } from "../logging_middleware";
import type { ScheduleResult } from "../types";
import { solveKnapsack } from "../utils/knapsack";
import { fetchDepots } from "./depot.service";
import { fetchVehicles } from "./vehicle.service";

export async function generateSchedule(): Promise<ScheduleResult[]> {
  const [depots, vehicles] = await Promise.all([
    fetchDepots(),
    fetchVehicles(),
  ]);

  await Log("backend", "debug", "service", "running optimization");

  const orderedDepots = [...depots].sort((left, right) => left.ID - right.ID);

  const schedule = orderedDepots.map((depot) => {
    const result = solveKnapsack(vehicles, depot.MechanicHours);

    return {
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
      selectedVehicles: result.selectedVehicleTasks,
      totalDuration: result.totalDuration,
      totalImpact: result.totalImpact,
    };
  });

  await Log("backend", "info", "service", "schedule generated");

  return schedule;
}
