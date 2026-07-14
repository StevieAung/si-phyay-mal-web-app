import type { VehicleType } from "./session";

export interface Allowance {
  liters: number;
  fills: number;
}

export function computeAllowance(vehicle: VehicleType, engineCc: number): Allowance {
  if (vehicle === "မော်တော်ဆိုင်ကယ်") {
    return { liters: 8, fills: 2 };
  }
  if (engineCc <= 2000) return { liters: 35, fills: 2 };
  if (engineCc <= 3000) return { liters: 40, fills: 2 };
  return { liters: 45, fills: 2 };
}
