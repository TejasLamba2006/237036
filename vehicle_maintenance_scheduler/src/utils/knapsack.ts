import type { KnapsackResult, Vehicle } from "../types";

function toPositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

export function solveKnapsack(
  vehicles: Vehicle[],
  capacity: number,
): KnapsackResult {
  const normalizedCapacity = toPositiveInteger(capacity);
  const itemCount = vehicles.length;
  const scores = Array.from({ length: itemCount + 1 }, () =>
    Array(normalizedCapacity + 1).fill(0),
  );
  const picked = Array.from({ length: itemCount + 1 }, () =>
    Array(normalizedCapacity + 1).fill(false),
  );

  for (let itemIndex = 1; itemIndex <= itemCount; itemIndex += 1) {
    const vehicle = vehicles[itemIndex - 1];
    const weight = toPositiveInteger(vehicle.Duration);
    const value = toPositiveInteger(vehicle.Impact);

    for (
      let currentCapacity = 0;
      currentCapacity <= normalizedCapacity;
      currentCapacity += 1
    ) {
      const withoutVehicle = scores[itemIndex - 1][currentCapacity];

      if (weight > currentCapacity) {
        scores[itemIndex][currentCapacity] = withoutVehicle;
        continue;
      }

      const withVehicle =
        value + scores[itemIndex - 1][currentCapacity - weight];

      if (withVehicle > withoutVehicle) {
        scores[itemIndex][currentCapacity] = withVehicle;
        picked[itemIndex][currentCapacity] = true;
        continue;
      }

      scores[itemIndex][currentCapacity] = withoutVehicle;
    }
  }

  const selectedVehicleTasks: string[] = [];
  let remainingCapacity = normalizedCapacity;
  let totalDuration = 0;
  let totalImpact = 0;

  for (let itemIndex = itemCount; itemIndex >= 1; itemIndex -= 1) {
    if (!picked[itemIndex][remainingCapacity]) {
      continue;
    }

    const vehicle = vehicles[itemIndex - 1];
    const weight = toPositiveInteger(vehicle.Duration);
    const value = toPositiveInteger(vehicle.Impact);

    selectedVehicleTasks.push(vehicle.TaskID);
    totalDuration += weight;
    totalImpact += value;

    if (weight <= remainingCapacity) {
      remainingCapacity -= weight;
    }
  }

  selectedVehicleTasks.reverse();

  return {
    selectedVehicleTasks,
    totalDuration,
    totalImpact,
  };
}
