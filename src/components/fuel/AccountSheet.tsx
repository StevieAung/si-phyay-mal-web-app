import { useEffect, useMemo, useRef, useState } from "react";
import { X, ShieldCheck, LogOut, Pencil, Car, Bike } from "lucide-react";
import { ProfileDashboard } from "./ProfileDashboard";
import { useSession, type VehicleType, type FuelPref } from "@/lib/fuel/session";
import { maskPhone, normalizeMyanmarPhone } from "@/lib/fuel/phone";
import { PARITY_POLICY_NOTE, parsePlate, type PlateParity } from "@/lib/fuel/plate";


export function AccountSheet() {
  const {
    isSheetOpen,
    step,
    closeSheet,
    profile,
    phoneE164,
    setPhone,
    completeProfile,
    updateProfile,
    signOut,
    openSheet,
  } = useSession();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management + Escape close.
  useEffect(() => {
    if (!isSheetOpen) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    const t = window.setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'input, select, button, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [isSheetOpen, closeSheet]);

  if (!isSheetOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSheet();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              {step === "view"
                ? "အကောင့် · Account"
                : "အချက်အလက်ဖြည့်ရန် · Sign in (Demo)"}
            </h2>
            <span className="rounded-full bg-limited/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-limited-foreground">
              Demo
            </span>
          </div>
          <button
            onClick={closeSheet}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === "phone" && <PhoneStep onSubmit={setPhone} />}
        {step === "profile" && phoneE164 && (
          <ProfileStep
            phoneE164={phoneE164}
            initial={profile ?? null}
            onSubmit={(p) => (profile ? updateProfile(p) : completeProfile(p))}
          />
        )}
        {step === "view" && profile && (
          <ProfileView
            onEdit={() => openSheet("profile")}
            onSignOut={signOut}
          />
        )}
      </div>
    </div>
  );
}

// ---------- Step 1: phone ----------

function PhoneStep({ onSubmit }: { onSubmit: (e164: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = normalizeMyanmarPhone(value);
    if (!res.ok) return setError(res.error);
    setError(null);
    onSubmit(res.e164);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-foreground">
        ကြည့်ရှုခြင်းက အကောင့်မလိုပါ။ လမ်းညွှန်နှင့် အစီရင်ခံခြင်းအတွက်သာ အချက်အလက်လိုသည်။
      </p>
      <div className="rounded-2xl bg-limited/10 p-3 text-[12px] text-foreground/80">
        <p className="flex items-start gap-1.5 font-medium">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-limited-foreground" aria-hidden />
          <span>
            SMS မပို့ပါ။ Backend မချိတ်ဆက်မီ ဤဖုန်းနံပါတ်ကို အမှန်တကယ်စစ်ဆေးထားခြင်း သို့ တစ်ခုတည်းဖြစ်ခြင်း အာမမခံနိုင်ပါ။
          </span>
        </p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          မြန်မာမိုဘိုင်းနံပါတ် · Myanmar mobile
        </span>
        <input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="09XXXXXXXXX"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          aria-invalid={!!error}
          aria-describedby={error ? "phone-err" : undefined}
        />
      </label>
      {error && (
        <p id="phone-err" className="rounded-xl bg-soldout/10 px-3 py-2 text-xs text-soldout">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        Demo အဖြစ် ဆက်ရန်
      </button>
    </form>
  );
}

// ---------- Step 2: profile ----------

function ProfileStep({
  phoneE164,
  initial,
  onSubmit,
}: {
  phoneE164: string;
  initial: {
    name: string;
    vehicle: VehicleType;
    plate: string;
    parity: PlateParity;
    fuelType: FuelPref;
    engineCc: number;
  } | null;
  onSubmit: (p: {
    name: string;
    vehicle: VehicleType;
    plate: string;
    parity: PlateParity;
    fuelType: FuelPref;
    engineCc: number;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [vehicle, setVehicle] = useState<VehicleType>(initial?.vehicle ?? "ကား");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [fuelType, setFuelType] = useState<FuelPref>(initial?.fuelType ?? "92");
  const [engineCc, setEngineCc] = useState<string>(
    initial?.engineCc ? String(initial.engineCc) : "",
  );
  const [privateOk, setPrivateOk] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plateInfo = useMemo(() => parsePlate(plate), [plate]);
  const ccNum = Number(engineCc);
  const ccValid = engineCc.trim() !== "" && Number.isFinite(ccNum) && ccNum > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("နာမည်ဖြည့်ပါ · Please enter your name.");
    if (!plateInfo.ok) return setError(plateInfo.error);
    if (!ccValid) return setError("Engine CC ကို မှန်ကန်စွာ ထည့်ပါ");
    if (!privateOk) return setError("Private vehicle checkbox is required.");
    if (!consentOk) return setError("သဘောတူညီချက်လိုအပ်သည် · Consent required.");
    setError(null);
    onSubmit({
      name: name.trim(),
      vehicle,
      plate: plateInfo.normalized,
      parity: plateInfo.parity,
      fuelType,
      engineCc: ccNum,
    });
  }

  const fuelOptions: FuelPref[] = ["92", "95", "Diesel"];

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-2xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
        <p>Demo ဖုန်း · <span className="font-medium text-foreground">{maskPhone(phoneE164)}</span></p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          အမည် · Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          ယာဉ်အမျိုးအစား · Vehicle type
        </span>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          <VehicleChoice
            active={vehicle === "ကား"}
            onClick={() => setVehicle("ကား")}
            Icon={Car}
            label="ကား"
          />
          <VehicleChoice
            active={vehicle === "မော်တော်ဆိုင်ကယ်"}
            onClick={() => setVehicle("မော်တော်ဆိုင်ကယ်")}
            Icon={Bike}
            label="မော်တော်ဆိုင်ကယ်"
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          ကားနံပါတ် · License plate
        </span>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="73W-15376 / ၇၃W-၁၅၃၇၆"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          aria-invalid={plate.length > 0 && !plateInfo.ok}
        />
        {plate.length > 0 && plateInfo.ok && (
          <p className="mt-1.5 text-[12px] text-foreground">
            Prefix <span className="font-semibold">{plateInfo.prefix}</span> →{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                plateInfo.parity === "စုံ"
                  ? "bg-available/15 text-available"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {plateInfo.parity}
            </span>
          </p>
        )}
        {plate.length > 0 && !plateInfo.ok && (
          <p className="mt-1.5 text-[12px] text-soldout">{plateInfo.error}</p>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">{PARITY_POLICY_NOTE}</p>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          ဆီအမျိုးအစား · Fuel type
        </span>
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {fuelOptions.map((f) => (
            <button
              type="button"
              key={f}
              role="radio"
              aria-checked={fuelType === f}
              onClick={() => setFuelType(f)}
              className={`inline-flex h-11 items-center justify-center rounded-xl border text-sm font-medium ${
                fuelType === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Engine CC
        </span>
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={engineCc}
            onChange={(e) => setEngineCc(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="ဥပမာ - 1500"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            aria-invalid={engineCc.length > 0 && !ccValid}
          />
          <span className="text-sm font-semibold text-muted-foreground">CC</span>
        </div>
        {engineCc.length > 0 && !ccValid && (
          <p className="mt-1.5 text-[12px] text-soldout">Engine CC ကို မှန်ကန်စွာ ထည့်ပါ</p>
        )}
      </label>

      <label className="flex items-start gap-2 text-[12px] text-foreground">
        <input
          type="checkbox"
          checked={privateOk}
          onChange={(e) => setPrivateOk(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D84315]"
        />
        <span>
          ဤယာဉ်သည် ကိုယ်ပိုင်စီးနင်းသည့် ယာဉ်ဖြစ်သည်။ ကုမ္ပဏီယာဉ်၊ တက္ကစီ၊ ဘတ်စ်ကားနှင့် အများပြည်သူသယ်ယူပို့ဆောင်ရေးများ ဤ MVP တွင် အသုံးမပြုနိုင်ပါ။
        </span>
      </label>

      <label className="flex items-start gap-2 text-[12px] text-foreground">
        <input
          type="checkbox"
          checked={consentOk}
          onChange={(e) => setConsentOk(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D84315]"
        />
        <span>
          ဖုန်းနံပါတ်နှင့် ကားနံပါတ်ကို လက်ရှိ session အတွင်း၊ ဤ browser tab ရဲ့ memory ထဲမှာသာ သိမ်းထားခြင်းကို သဘောတူပါသည်။
        </span>
      </label>

      {error && (
        <p className="rounded-xl bg-soldout/10 px-3 py-2 text-xs text-soldout">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {initial ? "သိမ်းရန် · Save" : "အတည်ပြု · Complete profile"}
      </button>
    </form>
  );
}


function VehicleChoice({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Car;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

// ---------- Step 3: view ----------

function ProfileView({
  onEdit,
  onSignOut,
}: {
  onEdit: () => void;
  onSignOut: () => void;
}) {
  const { profile } = useSession();
  if (!profile) return null;
  const initial = profile.name.trim().charAt(0).toUpperCase() || "•";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {profile.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {maskPhone(profile.phoneE164)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <Row label="ယာဉ်" value={profile.vehicle} />
        <Row label="ကားနံပါတ်" value={profile.plate} />
        <Row
          label="စုံ/မ"
          value={
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                profile.parity === "စုံ"
                  ? "bg-available/15 text-available"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {profile.parity}
            </span>
          }
        />
      </dl>
      <p className="text-[11px] text-muted-foreground">{PARITY_POLICY_NOTE}</p>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onEdit}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background text-sm font-medium text-foreground"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <button
          onClick={onSignOut}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-primary-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
      <ProfileDashboard profile={profile} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

