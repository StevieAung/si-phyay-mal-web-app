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
import {
  getProfileByIdFn,
  getProfileByPhoneFn,
  updateProfileByPhoneFn,
  setProfileQrFn,
} from "@/lib/profile.functions";
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
  qrCodePath: string | null;
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
  completeProfile: (p: Omit<Profile, "phoneE164" | "id" | "qrCodePath">) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (p: Omit<Profile, "phoneE164" | "id" | "qrCodePath">) => Promise<{ ok: boolean; error?: string }>;
  setQrCodePath: (path: string) => Promise<{ ok: boolean; error?: string }>;
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
  qr_code_path?: string | null;
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
    qrCodePath: row.qr_code_path ?? null,
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
      try {
        const row = await getProfileByIdFn({ data: { id } });
        if (cancelled || !row) return;
        const p = rowToProfile(row);
        setProfile(p);
        setPhoneState(p.phoneE164);
      } catch {
        /* ignore */
      }
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
    try {
      const row = await getProfileByPhoneFn({ data: { phone: e164 } });
      if (row) {
        const p = rowToProfile(row);
        setProfile(p);
        safeSet(PROFILE_ID_KEY, p.id);
        setStep("view");
        return;
      }
    } catch {
      /* fall through to profile step */
    }
    setStep("profile");
  }, []);

  const completeProfile = useCallback<SessionCtx["completeProfile"]>(
    async (p) => {
      if (!phoneE164) return { ok: false, error: "Phone missing." };

      // Anon INSERT is allowed by RLS but SELECT is denied, so we cannot
      // read the row back via .select() — do a bare insert, then read via
      // the server-side admin RPC.
      const { error: insertErr } = await supabase.from("profiles").insert({
        phone: phoneE164,
        name: p.name,
        vehicle_type: p.vehicle,
        license_plate: p.plate,
        fuel_type: p.fuelType,
        engine_cc: p.engineCc,
      });

      // Duplicate phone (23505) or any other insert failure: treat as an
      // update against the existing row. Any other insert error is fatal.
      const isDuplicate =
        !!insertErr && (insertErr.code === "23505" || /duplicate/i.test(insertErr.message));
      if (insertErr && !isDuplicate) {
        console.error("[profiles] insert failed", insertErr);
        return { ok: false, error: insertErr.message || "Could not save profile." };
      }

      let full: Profile | null = null;
      try {
        const existing = await getProfileByPhoneFn({ data: { phone: phoneE164 } });
        if (!existing) {
          return { ok: false, error: "Profile saved but could not be loaded." };
        }
        if (isDuplicate) {
          const updated = await updateProfileByPhoneFn({
            data: {
              id: existing.id,
              phone: phoneE164,
              name: p.name,
              vehicle_type: p.vehicle,
              license_plate: p.plate,
              fuel_type: p.fuelType,
              engine_cc: p.engineCc,
            },
          });
          if (updated) full = rowToProfile(updated);
        } else {
          full = rowToProfile(existing);
        }
      } catch (err) {
        console.error("[profiles] read-back failed", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not load saved profile.",
        };
      }

      if (!full) return { ok: false, error: "Could not save profile." };

      setProfile(full);
      safeSet(PROFILE_ID_KEY, full.id);
      setOpen(false);
      const intent = pending;
      setPending(null);
      if (intent) intent.onResume();
      return { ok: true };
    },
    [phoneE164, pending],
  );



  const updateProfile = useCallback<SessionCtx["updateProfile"]>(
    async (p) => {
      if (!phoneE164 || !profile) return { ok: false, error: "Not signed in." };
      try {
        const updated = await updateProfileByPhoneFn({
          data: {
            id: profile.id,
            phone: phoneE164,
            name: p.name,
            vehicle_type: p.vehicle,
            license_plate: p.plate,
            fuel_type: p.fuelType,
            engine_cc: p.engineCc,
          },
        });
        if (!updated) {
          console.error("[profiles] update returned no row");
          return { ok: false, error: "Could not update profile." };
        }
        setProfile(rowToProfile(updated));
        setStep("view");
        return { ok: true };
      } catch (err) {
        console.error("[profiles] update failed", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not update profile.",
        };
      }
    },
    [phoneE164, profile],
  );

  const setQrCodePath = useCallback<SessionCtx["setQrCodePath"]>(
    async (path) => {
      if (!phoneE164 || !profile) return { ok: false, error: "Not signed in." };
      try {
        const updated = await setProfileQrFn({
          data: { id: profile.id, phone: phoneE164, qr_path: path },
        });
        if (!updated) return { ok: false, error: "Could not save QR." };
        setProfile(rowToProfile(updated));
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not save QR.",
        };
      }
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
      setQrCodePath,
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
      setQrCodePath,
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
