import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SEED_STATIONS, seedReports } from "./stations";
import { supabase } from "@/integrations/supabase/client";
import {
  FUEL_STATUSES,
  FUEL_TYPES,
  QUEUE_LENGTHS,
  type FuelStatus,
  type FuelType,
  type QueueLength,
  type Report,
  type Station,
} from "./types";

const STORAGE_VERSION = 1;
// Note: The legacy REPORTS_KEY (`sfm:v1:reports`) is intentionally NOT read or
// written anymore — reports live in Lovable Cloud (Supabase) as of Phase 2.
// Existing localStorage entries are left in place and simply ignored.
const DEVICE_KEY = `sfm:v${STORAGE_VERSION}:deviceId`;
const COOLDOWN_KEY = `sfm:v${STORAGE_VERSION}:confirmCooldown`;
const CONFIRM_COOLDOWN_MS = 60_000; // 60s per (device, report)


export interface ConfirmResult {
  ok: boolean;
  cooldownRemainingMs?: number;
}

interface FuelStore {
  stations: Station[];
  reports: Report[];
  addReport: (input: {
    stationId: string;
    fuelType: FuelType;
    status: FuelStatus;
    queue: QueueLength | null;
    profileId: string;
  }) => void;
  confirmReport: (reportId: string, profileId: string) => Promise<ConfirmResult>;
  canConfirm: (reportId: string, nowMs?: number) => boolean;
  deviceId: string;
  hydrated: boolean;
}


const FuelContext = createContext<FuelStore | null>(null);

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Validation ----------

function isReport(v: unknown): v is Report {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string") return false;
  if (typeof r.stationId !== "string") return false;
  if (typeof r.fuelType !== "string" || !FUEL_TYPES.includes(r.fuelType as FuelType)) return false;
  if (typeof r.status !== "string" || !FUEL_STATUSES.includes(r.status as FuelStatus)) return false;
  if (
    r.queue !== null &&
    (typeof r.queue !== "string" || !QUEUE_LENGTHS.includes(r.queue as QueueLength))
  )
    return false;
  if (typeof r.timestamp !== "number" || !Number.isFinite(r.timestamp)) return false;
  if (typeof r.deviceId !== "string") return false;
  return true;
}

function normalizeReport(v: unknown): Report | null {
  if (!isReport(v)) return null;
  const r = v as Report;
  return {
    id: r.id,
    stationId: r.stationId,
    fuelType: r.fuelType,
    status: r.status,
    queue: r.status === "Closed" || r.status === "Sold Out" ? null : r.queue,
    timestamp: r.timestamp,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : r.timestamp,
    deviceId: r.deviceId,
    confirmationCount:
      typeof r.confirmationCount === "number" && r.confirmationCount >= 0
        ? Math.floor(r.confirmationCount)
        : 0,
  };
}

// ---------- Safe storage ----------

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy errors */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// Reports are no longer read from localStorage; they come from Supabase.


function loadCooldowns(): Record<string, number> {
  const raw = safeGet(COOLDOWN_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    safeRemove(COOLDOWN_KEY);
    return {};
  }
}

function loadOrCreateDeviceId(): string {
  const existing = safeGet(DEVICE_KEY);
  if (existing && existing.length > 0) return existing;
  const id = randomId("dev");
  safeSet(DEVICE_KEY, id);
  return id;
}

// ---------- Provider ----------

export function FuelProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>(SEED_STATIONS);
  // Start with seed data so SSR and first client render match.
  const [reports, setReports] = useState<Report[]>(() => seedReports());
  const [deviceId, setDeviceId] = useState<string>("dev-ssr");
  const [hydrated, setHydrated] = useState(false);
  const cooldownsRef = useRef<Record<string, number>>({});

  // Client-only hydration for device id + confirm cooldowns.
  useEffect(() => {
    setDeviceId(loadOrCreateDeviceId());
    cooldownsRef.current = loadCooldowns();
    setHydrated(true);
  }, []);


  // Fetch stations from Lovable Cloud; fall back to seed on error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: stationRows, error: sErr } = await supabase
        .from("stations")
        .select("id, name, address, latitude, longitude")
        .eq("is_active", true);
      if (sErr || !stationRows || cancelled) return;

      const { data: fuelRows, error: fErr } = await supabase
        .from("station_fuels")
        .select("station_id, fuel_type")
        .eq("is_offered", true);
      if (fErr || cancelled) return;

      const fuelsByStation = new Map<string, FuelType[]>();
      for (const row of fuelRows ?? []) {
        const ft = row.fuel_type as FuelType;
        if (!FUEL_TYPES.includes(ft)) continue;
        const arr = fuelsByStation.get(row.station_id) ?? [];
        arr.push(ft);
        fuelsByStation.set(row.station_id, arr);
      }

      // Preserve UI-only display metadata (nameEn/township) from seed lookup.
      const seedMeta = new Map(SEED_STATIONS.map((s) => [s.id, s]));
      const merged: Station[] = stationRows.map((r) => {
        const meta = seedMeta.get(r.id);
        return {
          id: r.id,
          name: r.name,
          nameEn: meta?.nameEn ?? r.name,
          address: r.address,
          township: meta?.township ?? "",
          lat: r.latitude,
          lng: r.longitude,
          offeredFuels: fuelsByStation.get(r.id) ?? meta?.offeredFuels ?? [],
        };
      });

      if (!cancelled && merged.length > 0) setStations(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch community reports + confirmation counts from Lovable Cloud.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("reports_public")
        .select("id, station_id, fuel_type, status, queue_level, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error || !data || cancelled) return;
      const mapped: Report[] = [];
      const ids: string[] = [];
      for (const row of data) {
        if (!row.id || !row.station_id || !row.created_at) continue;
        const ft = row.fuel_type as FuelType;
        const st = row.status as FuelStatus;
        if (!FUEL_TYPES.includes(ft) || !FUEL_STATUSES.includes(st)) continue;
        const q = row.queue_level as QueueLength | null;
        const queue =
          st === "Closed" || st === "Sold Out"
            ? null
            : q && QUEUE_LENGTHS.includes(q)
              ? q
              : null;
        const ts = new Date(row.created_at).getTime();
        ids.push(row.id);
        mapped.push({
          id: row.id,
          stationId: row.station_id,
          fuelType: ft,
          status: st,
          queue,
          timestamp: ts,
          createdAt: ts,
          deviceId: "anon",
          confirmationCount: 0,
        });
      }

      // Enrich with aggregate confirmation counts from the public view.
      const counts = new Map<string, number>();
      if (ids.length > 0) {
        const { data: confRows, error: cErr } = await supabase
          .from("report_confirmation_counts")
          .select("report_id, count")
          .in("report_id", ids);
        if (!cErr && confRows) {
          for (const row of confRows) {
            if (row.report_id && typeof row.count === "number") {
              counts.set(row.report_id, row.count);
            }
          }
        }
      }
      for (const r of mapped) {
        r.confirmationCount = counts.get(r.id) ?? 0;
      }


      if (!cancelled) setReports(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);



  const addReport = useCallback<FuelStore["addReport"]>(
    ({ stationId, fuelType, status, queue, profileId }) => {
      const now = Date.now();
      const effectiveQueue =
        status === "Closed" || status === "Sold Out" ? null : queue;
      const tempId = randomId("r");
      // Optimistic insert so the UI updates immediately.
      const optimistic: Report = {
        id: tempId,
        stationId,
        fuelType,
        status,
        queue: effectiveQueue,
        timestamp: now,
        createdAt: now,
        deviceId,
        confirmationCount: 0,
      };
      setReports((prev) => [optimistic, ...prev]);

      // Persist to Lovable Cloud, tying the row to the submitting profile.
      // NOTE: reports table denies SELECT for anon/authenticated (reads go through
      // the reports_public view), so we intentionally do NOT chain .select() here.
      (async () => {
        const { error } = await supabase.from("reports").insert({
          station_id: stationId,
          fuel_type: fuelType,
          status,
          queue_level: effectiveQueue,
          profile_id: profileId,
        });
        if (error) {
          console.error("[reports] insert failed", error);
          setReports((prev) => prev.filter((r) => r.id !== tempId));
          return;
        }
        // Refresh from the public view to pick up the real row id + timestamp
        // and any other new reports.
        const { data: rows } = await supabase
          .from("reports_public")
          .select("id, station_id, fuel_type, status, queue_level, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (!rows) return;
        const mapped: Report[] = [];
        for (const row of rows) {
          if (!row.id || !row.station_id || !row.created_at) continue;
          const ft = row.fuel_type as FuelType;
          const st = row.status as FuelStatus;
          if (!FUEL_TYPES.includes(ft) || !FUEL_STATUSES.includes(st)) continue;
          const q = row.queue_level as QueueLength | null;
          const queue =
            st === "Closed" || st === "Sold Out"
              ? null
              : q && QUEUE_LENGTHS.includes(q)
                ? q
                : null;
          const ts = new Date(row.created_at).getTime();
          mapped.push({
            id: row.id,
            stationId: row.station_id,
            fuelType: ft,
            status: st,
            queue,
            timestamp: ts,
            createdAt: ts,
            deviceId: "anon",
            confirmationCount: 0,
          });
        }
        setReports(mapped);
      })();
    },
    [deviceId],
  );


  const canConfirm = useCallback(
    (reportId: string, nowMs: number = Date.now()) => {
      const key = `${deviceId}:${reportId}`;
      const last = cooldownsRef.current[key] ?? 0;
      return nowMs - last >= CONFIRM_COOLDOWN_MS;
    },
    [deviceId],
  );

  const confirmReport = useCallback<FuelStore["confirmReport"]>(
    async (reportId, profileId) => {
      const now = Date.now();
      const key = `${deviceId}:${reportId}`;
      const last = cooldownsRef.current[key] ?? 0;
      const elapsed = now - last;
      if (elapsed < CONFIRM_COOLDOWN_MS) {
        return { ok: false, cooldownRemainingMs: CONFIRM_COOLDOWN_MS - elapsed };
      }

      // Persist to Lovable Cloud. Unique (report_id, profile_id) prevents duplicates.
      const { error } = await supabase
        .from("report_confirmations")
        .insert({ report_id: reportId, profile_id: profileId });
      if (error) {
        // 23505 = unique violation → this profile already confirmed this report.
        const code = (error as { code?: string }).code;
        if (code !== "23505") {
          console.error("[confirmations] insert failed", error);
          return { ok: false };
        }
        // Treat duplicate as a cooldown-style no-op.
        cooldownsRef.current = { ...cooldownsRef.current, [key]: now };
        safeSet(COOLDOWN_KEY, JSON.stringify(cooldownsRef.current));
        return { ok: false, cooldownRemainingMs: CONFIRM_COOLDOWN_MS };
      }

      cooldownsRef.current = { ...cooldownsRef.current, [key]: now };
      safeSet(COOLDOWN_KEY, JSON.stringify(cooldownsRef.current));
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, confirmationCount: r.confirmationCount + 1 }
            : r,
        ),
      );
      return { ok: true };
    },
    [deviceId],
  );


  const value = useMemo<FuelStore>(
    () => ({
      stations,
      reports,
      addReport,
      confirmReport,
      canConfirm,
      deviceId,
      hydrated,
    }),
    [stations, reports, addReport, confirmReport, canConfirm, deviceId, hydrated],
  );

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

export function useFuelStore(): FuelStore {
  const ctx = useContext(FuelContext);
  if (!ctx) throw new Error("useFuelStore must be used within FuelProvider");
  return ctx;
}
