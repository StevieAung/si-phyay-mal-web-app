import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_STATIONS, seedReports } from "./stations";
import type { FuelType, QueueLength, Report, Station, FuelStatus } from "./types";

interface FuelStore {
  stations: Station[];
  reports: Report[];
  addReport: (input: {
    stationId: string;
    fuelType: FuelType;
    status: FuelStatus;
    queue: QueueLength | null;
  }) => void;
  deviceId: string;
}

const FuelContext = createContext<FuelStore | null>(null);

function newDeviceId() {
  return `dev-${Math.random().toString(36).slice(2, 10)}`;
}

export function FuelProvider({ children }: { children: ReactNode }) {
  const [stations] = useState<Station[]>(SEED_STATIONS);
  const [reports, setReports] = useState<Report[]>(() => seedReports());
  const [deviceId] = useState<string>(newDeviceId);

  const addReport = useCallback<FuelStore["addReport"]>(
    ({ stationId, fuelType, status, queue }) => {
      setReports((prev) => [
        {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          stationId,
          fuelType,
          status,
          queue: status === "Closed" || status === "Sold Out" ? null : queue,
          timestamp: Date.now(),
          deviceId,
        },
        ...prev,
      ]);
    },
    [deviceId],
  );

  const value = useMemo(
    () => ({ stations, reports, addReport, deviceId }),
    [stations, reports, addReport, deviceId],
  );

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

export function useFuelStore(): FuelStore {
  const ctx = useContext(FuelContext);
  if (!ctx) throw new Error("useFuelStore must be used within FuelProvider");
  return ctx;
}
