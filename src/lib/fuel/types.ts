export type FuelType = "92" | "95" | "Diesel" | "Premium Diesel";

export const FUEL_TYPES: FuelType[] = ["92", "95", "Diesel", "Premium Diesel"];

export type FuelStatus = "Available" | "Limited" | "Sold Out" | "Closed";

export const FUEL_STATUSES: FuelStatus[] = ["Available", "Limited", "Sold Out", "Closed"];

export type QueueLength = "No Queue" | "Short" | "Medium" | "Long";

export const QUEUE_LENGTHS: QueueLength[] = ["No Queue", "Short", "Medium", "Long"];

export type Confidence = "High" | "Medium" | "Low" | "Conflicting";

export interface Report {
  id: string;
  stationId: string;
  fuelType: FuelType;
  status: FuelStatus;
  queue: QueueLength | null;
  timestamp: number;
  createdAt: number;
  deviceId: string;
  confirmationCount: number;
}

export interface Station {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  township: string;
  lat: number;
  lng: number;
  offeredFuels: FuelType[];
}

export interface FuelState {
  fuelType: FuelType;
  status: FuelStatus;
  queue: QueueLength | null;
  updatedAt: number;
  confirmations: number;
  conflicting: number;
  confidence: Confidence;
}
