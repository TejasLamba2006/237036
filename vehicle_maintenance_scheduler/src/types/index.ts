export interface Depot {
  ID: number;
  MechanicHours: number;
}

export interface Vehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface KnapsackResult {
  selectedVehicleTasks: string[];
  totalDuration: number;
  totalImpact: number;
}

export interface ScheduleResult {
  depotId: number;
  mechanicHours: number;
  selectedVehicles: string[];
  totalDuration: number;
  totalImpact: number;
}

export interface DepotsResponse {
  depots: Depot[];
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
}

export interface ScheduleSuccessResponse {
  success: true;
  data: ScheduleResult[];
}

export interface ScheduleErrorResponse {
  success: false;
  message: string;
}
