import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlateParity } from "./plate";
import { parsePlate } from "./plate";

export type SheetStep = "phone" | "profile" | "view";
export type VehicleType = "ကား" | "မော်တော်ဆိုင်ကယ်";
export type FuelPref = "92" | "95" | "Diesel";

export interface Profile {
  id: string;
  name: string;
  phoneE164: string;
  vehicle: VehicleType;
  plate: string;
  parity: PlateParity;
  fuelType: FuelPref;
  engineCc: number;
}

export type PendingIntentKind = "directions" | "report" | "confirm";

export interface PendingIntent {
  kind: PendingIntentKind;
  stationId?: string;
  directionsUrl?: string;
  onResume: () => void;
}

interface SessionCtx {
  profile: Profile | null;
  phoneE164: string | null;
  isSheetOpen: boolean;
  step: SheetStep;
  pending: PendingIntent | null;
  openSheet: (step?: SheetStep) => void;
  closeSheet: () => void;
  setPhone: (e164: string) => Promise<void>;
  completeProfile: (p: Omit<Profile, "phoneE164" | "id">) => Promise<void>;
  updateProfile: (p: Omit<Profile, "phoneE164" | "id">) => Promise<void>;
  signOut: () => void;
  requireCompleteProfile: (intent: PendingIntent) => boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

const PROFILE_ID_KEY = "sfm:v1:profileId";

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
    /* ignore */
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

function rowToProfile(row: {
  id: string;
  phone: string;
  name: string;
  vehicle_type: string;
  license_plate: string;
  fuel_type: string;
  engine_cc: number;
}): Profile {
  const parsed = parsePlate(row.license_plate);
  const parity: PlateParity = parsed.ok ? parsed.parity : "စုံ";
  return {
    id: row.id,
    name: row.name,
    phoneE164: row.phone,
    vehicle: (row.vehicle_type as VehicleType) ?? "ကား",
    plate: row.license_plate,
    parity,
    fuelType: (row.fuel_type as FuelPref) ?? "92",
    engineCc: row.engine_cc,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phoneE164, setPhoneState] = useState<string | null>(null);
  const [isSheetOpen, setOpen] = useState(false);
  const [step, setStep] = useState<SheetStep>("phone");
  const [pending, setPending] = useState<PendingIntent | null>(null);

  // Rehydrate profile from Supabase on mount using the persisted profile id.
  useEffect(() => {
    const id = safeGet(PROFILE_ID_KEY);
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_profile_by_id", { _id: id });
      if (cancelled || error || !data || data.length === 0) return;
      const p = rowToProfile(data[0]);
      setProfile(p);
      setPhoneState(p.phoneE164);
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  const openSheet = useCallback(
    (s?: SheetStep) => {
      setStep(s ?? (profile ? "view" : phoneE164 ? "profile" : "phone"));
      setOpen(true);
    },
    [profile, phoneE164],
  );

  const closeSheet = useCallback(() => {
    setOpen(false);
    setPending(null);
  }, []);

  const setPhone = useCallback(async (e164: string) => {
    setPhoneState(e164);
    // Look up an existing profile for this phone.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, phone, name, vehicle_type, license_plate, fuel_type, engine_cc")
      .eq("phone", e164)
      .maybeSingle();
    if (!error && data) {
      const p = rowToProfile(data);
      setProfile(p);
      safeSet(PROFILE_ID_KEY, p.id);
      setStep("view");
      return;
    }
    setStep("profile");
  }, []);

  const completeProfile = useCallback<SessionCtx["completeProfile"]>(
    async (p) => {
      if (!phoneE164) return;
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            phone: phoneE164,
            name: p.name,
            vehicle_type: p.vehicle,
            license_plate: p.plate,
            fuel_type: p.fuelType,
            engine_cc: p.engineCc,
          },
          { onConflict: "phone" },
        )
        .select("id, phone, name, vehicle_type, license_plate, fuel_type, engine_cc")
        .single();
      if (error || !data) {
        console.error("[profiles] upsert failed", error);
        return;
      }
      const full = rowToProfile(data);
      setProfile(full);
      safeSet(PROFILE_ID_KEY, full.id);
      setOpen(false);
      const intent = pending;
      setPending(null);
      if (intent) intent.onResume();
    },
    [phoneE164, pending],
  );

  const updateProfile = useCallback<SessionCtx["updateProfile"]>(
    async (p) => {
      if (!phoneE164 || !profile) return;
      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: p.name,
          vehicle_type: p.vehicle,
          license_plate: p.plate,
          fuel_type: p.fuelType,
          engine_cc: p.engineCc,
        })
        .eq("id", profile.id)
        .select("id, phone, name, vehicle_type, license_plate, fuel_type, engine_cc")
        .single();
      if (error || !data) {
        console.error("[profiles] update failed", error);
        return;
      }
      setProfile(rowToProfile(data));
      setStep("view");
    },
    [phoneE164, profile],
  );

  const signOut = useCallback(() => {
    setProfile(null);
    setPhoneState(null);
    setPending(null);
    setOpen(false);
    setStep("phone");
    safeRemove(PROFILE_ID_KEY);
  }, []);

  const requireCompleteProfile = useCallback(
    (intent: PendingIntent) => {
      if (profile) {
        intent.onResume();
        return true;
      }
      setPending(intent);
      setStep(phoneE164 ? "profile" : "phone");
      setOpen(true);
      return false;
    },
    [profile, phoneE164],
  );

  const value = useMemo<SessionCtx>(
    () => ({
      profile,
      phoneE164,
      isSheetOpen,
      step,
      pending,
      openSheet,
      closeSheet,
      setPhone,
      completeProfile,
      updateProfile,
      signOut,
      requireCompleteProfile,
    }),
    [
      profile,
      phoneE164,
      isSheetOpen,
      step,
      pending,
      openSheet,
      closeSheet,
      setPhone,
      completeProfile,
      updateProfile,
      signOut,
      requireCompleteProfile,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
