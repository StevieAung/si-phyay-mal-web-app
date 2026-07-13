import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlateParity } from "./plate";

export type SheetStep = "phone" | "profile" | "view";
export type VehicleType = "ကား" | "မော်တော်ဆိုင်ကယ်";

export interface Profile {
  name: string;
  phoneE164: string;
  vehicle: VehicleType;
  plate: string;
  parity: PlateParity;
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
  setPhone: (e164: string) => void;
  completeProfile: (p: Omit<Profile, "phoneE164">) => void;
  updateProfile: (p: Omit<Profile, "phoneE164">) => void;
  signOut: () => void;
  requireCompleteProfile: (intent: PendingIntent) => boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phoneE164, setPhoneState] = useState<string | null>(null);
  const [isSheetOpen, setOpen] = useState(false);
  const [step, setStep] = useState<SheetStep>("phone");
  const [pending, setPending] = useState<PendingIntent | null>(null);

  const openSheet = useCallback(
    (s?: SheetStep) => {
      setStep(s ?? (profile ? "view" : phoneE164 ? "profile" : "phone"));
      setOpen(true);
    },
    [profile, phoneE164],
  );

  const closeSheet = useCallback(() => {
    setOpen(false);
    // Cancel clears any pending protected action.
    setPending(null);
  }, []);

  const setPhone = useCallback((e164: string) => {
    setPhoneState(e164);
    setStep("profile");
  }, []);

  const completeProfile = useCallback(
    (p: Omit<Profile, "phoneE164">) => {
      if (!phoneE164) return;
      const full: Profile = { ...p, phoneE164 };
      setProfile(full);
      setOpen(false);
      const intent = pending;
      setPending(null);
      if (intent) intent.onResume();
    },
    [phoneE164, pending],
  );

  const updateProfile = useCallback(
    (p: Omit<Profile, "phoneE164">) => {
      if (!phoneE164) return;
      setProfile({ ...p, phoneE164 });
      setStep("view");
    },
    [phoneE164],
  );

  const signOut = useCallback(() => {
    setProfile(null);
    setPhoneState(null);
    setPending(null);
    setOpen(false);
    setStep("phone");
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
