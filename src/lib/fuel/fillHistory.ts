import { useCallback, useEffect, useState } from "react";
import type { FuelType } from "./types";

export interface FillEntry {
  id: string;
  ts: number;
  stationId: string;
  stationName: string;
  fuelType: FuelType;
  liters: number;
  pricePerL: number;
  total: number;
}

const KEY = "sfm:v1:fills";

function read(): FillEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as FillEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(entries: FillEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function useFillHistory() {
  const [entries, setEntries] = useState<FillEntry[]>([]);

  useEffect(() => {
    setEntries(read());
  }, []);

  const addFill = useCallback((e: Omit<FillEntry, "id" | "ts">) => {
    const entry: FillEntry = {
      ...e,
      id: `fill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
    };
    setEntries((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      write(next);
      return next;
    });
    return entry;
  }, []);

  return { entries, addFill };
}
