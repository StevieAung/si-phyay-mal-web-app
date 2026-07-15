import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AppShell, BrandHeader } from "@/components/fuel/AppShell";
import { StationPicker } from "@/components/fuel/StationPicker";
import { useFuelStore } from "@/lib/fuel/store";
import { useSession } from "@/lib/fuel/session";
import { useGeolocation } from "@/hooks/useGeolocation";
import { distanceKm } from "@/lib/fuel/derive";
import {
  FUEL_TYPES,
  type FuelStatus,
  type FuelType,
  type QueueLength,
  type Station,
} from "@/lib/fuel/types";

const searchSchema = z.object({
  stationId: z.string().optional(),
});

export const Route = createFileRoute("/report")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ReportPage,
});

// ============ Local trust model =====================================

type Presence = "now" | "recent";
type RecentWindow = "5" | "15" | "30";
type VerifyState = "idle" | "checking" | "verified" | "failed";

const STATUS_OPTIONS: {
  value: FuelStatus;
  my: string;
  tone: "available" | "limited" | "sold" | "closed";
}[] = [
  { value: "Available", my: "ရရှိနေသည်", tone: "available" },
  { value: "Limited", my: "ဆီနည်းနေသည်", tone: "limited" },
  { value: "Sold Out", my: "ရောင်းကုန်ပြီ", tone: "sold" },
  { value: "Closed", my: "ဆိုင်ပိတ်ထားသည်", tone: "closed" },
];

const QUEUE_OPTIONS: { value: QueueLength; my: string }[] = [
  { value: "No Queue", my: "တန်းမရှိ" },
  { value: "Short", my: "၁–၁၀ စီး" },
  { value: "Medium", my: "၁၁–၃၀ စီး" },
  { value: "Long", my: "၃၀ စီးကျော်" },
];

const RECENT_OPTIONS: { value: RecentWindow; my: string }[] = [
  { value: "5", my: "၅ မိနစ်အတွင်း" },
  { value: "15", my: "၁၅ မိနစ်အတွင်း" },
  { value: "30", my: "၃၀ မိနစ်အတွင်း" },
];

const STATUS_LABEL: Record<FuelStatus, string> = {
  Available: "ရရှိနေသည်",
  Limited: "ဆီနည်းနေသည်",
  "Sold Out": "ရောင်းကုန်ပြီ",
  Closed: "ဆိုင်ပိတ်ထားသည်",
};

const QUEUE_LABEL: Record<QueueLength, string> = {
  "No Queue": "တန်းမရှိ",
  Short: "၁–၁၀ စီး",
  Medium: "၁၁–၃၀ စီး",
  Long: "၃၀ စီးကျော်",
};

interface Trust {
  level: "High" | "Medium";
  text: string;
  sourceTag: string;
  freshnessTag: string;
  sourceMy: string;
}

function computeTrust(
  presence: Presence,
  verify: VerifyState,
  recent: RecentWindow,
  status: FuelStatus,
): Trust {
  const freshMin = status === "Limited" ? 15 : 20;
  const freshnessTag = `မိနစ် ${freshMin} သက်တမ်း`;
  if (presence === "now" && verify === "verified") {
    return {
      level: "High",
      text: `ဒီ report ကို ဆိုင်အနီးမှ အတည်ပြုထားပြီး မိနစ် ${freshMin} ခန့် လတ်ဆတ်သောအချက်အလက်အဖြစ် ပြသပါမယ်။`,
      sourceTag: "Location verified",
      sourceMy: "ဆိုင်တွင်ရှိနေ · အတည်ပြုပြီး",
      freshnessTag,
    };
  }
  if (presence === "now") {
    return {
      level: "Medium",
      text: "တည်နေရာ မအတည်ပြုရသေးလို့ ယုံကြည်မှုအလယ်အလတ်ဖြင့် ပြသပါမယ်။",
      sourceTag: "တည်နေရာမစစ်ရသေး",
      sourceMy: "ဆိုင်တွင်ရှိနေ",
      freshnessTag,
    };
  }
  const win = RECENT_OPTIONS.find((r) => r.value === recent)!.my;
  return {
    level: "Medium",
    text: `${win} မြင်တွေ့ခဲ့သော report အဖြစ် ယုံကြည်မှုအလယ်အလတ်ဖြင့် ပြသပါမယ်။`,
    sourceTag: "မကြာသေးခင်ကမြင်တွေ့",
    sourceMy: `မကြာသေးခင်က · ${win}`,
    freshnessTag,
  };
}

// ============ Component ============================================

function ReportPage() {
  const { stationId: preselected } = Route.useSearch();
  const { stations, addReport } = useFuelStore();
  const navigate = useNavigate();
  const { profile, requireCompleteProfile, isSheetOpen } = useSession();
  const geo = useGeolocation();
  const guardTriggered = useRef(false);

  useEffect(() => {
    if (profile || guardTriggered.current) return;
    guardTriggered.current = true;
    requireCompleteProfile({
      kind: "report",
      stationId: preselected,
      onResume: () => {
        /* stay on /report */
      },
    });
  }, [profile, requireCompleteProfile, preselected]);

  useEffect(() => {
    if (!profile && guardTriggered.current && !isSheetOpen) {
      navigate({ to: "/" });
    }
  }, [profile, isSheetOpen, navigate]);

  const [stationId, setStationId] = useState<string>(
    preselected ?? stations[0]?.id ?? "",
  );
  const [fuelType, setFuelType] = useState<FuelType>("Diesel");
  const [status, setStatus] = useState<FuelStatus>("Available");
  const [queue, setQueue] = useState<QueueLength>("No Queue");
  const [presence, setPresence] = useState<Presence>("now");
  const [recent, setRecent] = useState<RecentWindow>("5");
  const [verify, setVerify] = useState<VerifyState>("idle");
  const [verifyMsg, setVerifyMsg] = useState<string>(
    "Exact location ကို မသိမ်းပါ။ ဆိုင်အနီးရှိ/မရှိပဲ စစ်ပါမယ်။",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<null | SubmittedSummary>(null);

  const selectedStation = stations.find((s) => s.id === stationId);
  const availableFuels = selectedStation?.offeredFuels ?? FUEL_TYPES;

  // Reset fuel if switching station drops the current selection.
  useEffect(() => {
    if (selectedStation && !selectedStation.offeredFuels.includes(fuelType)) {
      setFuelType(selectedStation.offeredFuels[0] ?? "Diesel");
    }
  }, [selectedStation, fuelType]);

  // Presence "recent" clears any verified state.
  useEffect(() => {
    if (presence !== "now" && verify === "verified") setVerify("idle");
  }, [presence, verify]);

  const queueDisabled = status === "Sold Out" || status === "Closed";
  const effectiveQueue = queueDisabled ? null : queue;

  const trust = useMemo(
    () => computeTrust(presence, verify, recent, status),
    [presence, verify, recent, status],
  );

  function runVerify(station: Station) {
    if (!navigator.geolocation) {
      setVerify("failed");
      setVerifyMsg("ဤ browser မှာ location မရနိုင်ပါ။ Report ကို ဆက်တင်နိုင်ပါတယ်။");
      return;
    }
    setVerify("checking");
    setVerifyMsg("စစ်ဆေးနေသည်...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Compute distance only; never store the coords.
        const d = distanceKm(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { lat: station.lat, lng: station.lng },
        );
        if (d <= 1.0) {
          setVerify("verified");
          setVerifyMsg(
            "ဆိုင်အနီးရှိကြောင်း အတည်ပြုထားပါတယ်။ Exact location ကို မသိမ်းပါ။",
          );
        } else {
          setVerify("failed");
          setVerifyMsg(
            `ဆိုင်နှင့် ${d.toFixed(1)} km ဝေးနေပါတယ်။ Report ကို ယုံကြည်မှုအလယ်အလတ်ဖြင့် ဆက်တင်နိုင်ပါတယ်။`,
          );
        }
      },
      () => {
        setVerify("failed");
        setVerifyMsg(
          "Location permission မရပါ။ Report ကို ယုံကြည်မှုအလယ်အလတ်ဖြင့် ဆက်တင်နိုင်ပါတယ်။",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedStation) return setError("Please select a station.");
    if (!selectedStation.offeredFuels.includes(fuelType))
      return setError("This station doesn't offer that fuel type.");
    if (!profile) return setError("Please complete your profile before reporting.");

    addReport({
      stationId,
      fuelType,
      status,
      queue: effectiveQueue,
      profileId: profile.id,
    });

    setSubmitted({
      stationName: selectedStation.name,
      stationTownship: selectedStation.township,
      fuelType,
      status,
      queue: effectiveQueue,
      observation:
        presence === "now"
          ? "အခု ဆိုင်မှာရှိနေ"
          : `မကြာသေးခင်က · ${RECENT_OPTIONS.find((r) => r.value === recent)!.my}`,
      verification: verify === "verified" ? "Location verified" : "Unverified",
      trustLevel: trust.level,
    });
  }

  if (submitted) {
    return (
      <AppShell>
        <SuccessView
          summary={submitted}
          onAnother={() => setSubmitted(null)}
          onViewStation={() =>
            navigate({ to: "/station/$id", params: { id: stationId } })
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BrandHeader />

      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          အခြေအနေ မျှဝေမယ်
        </h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          အခုသင်မြင်နေရတဲ့အခြေအနေက နောက်ယာဉ်မောင်းတစ်ယောက်ရဲ့ အချိန်ကိုကယ်တင်နိုင်ပါတယ်။
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Station */}
        <Field label="ဆီဆိုင်" en="Station">
          <StationPicker
            stations={stations}
            value={stationId}
            onChange={setStationId}
            origin={geo.coords}
          />
        </Field>

        {/* Presence */}
        <Field label="ဘယ်အချိန်က ရှိခဲ့တာလဲ" hint="Evidence source">
          <div className="grid grid-cols-2 gap-2">
            <PresenceCard
              active={presence === "now"}
              onClick={() => setPresence("now")}
              title="အခု ဆိုင်မှာရှိနေပါတယ်"
            />
            <PresenceCard
              active={presence === "recent"}
              onClick={() => setPresence("recent")}
              title="မကြာသေးခင်က ထွက်လာပါတယ်"
            />
          </div>

          {presence === "now" ? (
            <VerificationCard
              state={verify}
              message={verifyMsg}
              onVerify={() => selectedStation && runVerify(selectedStation)}
              disabled={!selectedStation}
            />
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {RECENT_OPTIONS.map((r) => (
                <ChipRadio
                  key={r.value}
                  active={recent === r.value}
                  onClick={() => setRecent(r.value)}
                  label={r.my}
                />
              ))}
            </div>
          )}
        </Field>

        {/* Fuel type */}
        <Field label="ဆီအမျိုးအစား" en="Fuel type">
          <div className="flex flex-wrap gap-2">
            {availableFuels.map((f) => (
              <ChipRadio
                key={f}
                active={fuelType === f}
                onClick={() => setFuelType(f)}
                label={f}
              />
            ))}
          </div>
        </Field>

        {/* Status */}
        <Field label="အခြေအနေ" en="Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <StatusChip
                key={s.value}
                tone={s.tone}
                active={status === s.value}
                onClick={() => setStatus(s.value)}
                label={s.my}
              />
            ))}
          </div>
        </Field>

        {/* Queue */}
        <Field
          label="တန်းစီယာဉ်"
          en="Queue estimate"
          hint={queueDisabled ? "ဤအခြေအနေတွင် မလိုအပ်ပါ" : "မျက်မြင်ခန့်မှန်း"}
        >
          <div className="flex flex-wrap gap-2">
            {QUEUE_OPTIONS.map((q) => (
              <ChipRadio
                key={q.value}
                active={!queueDisabled && queue === q.value}
                disabled={queueDisabled}
                onClick={() => !queueDisabled && setQueue(q.value)}
                label={q.my}
              />
            ))}
          </div>
        </Field>

        {/* Note */}
        <Field label="ထပ်မံပြောလိုသည်များ" en="Optional">
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 150))}
              maxLength={150}
              rows={3}
              placeholder="ဥပမာ — Diesel ပဲရပါတယ်၊ ကားတန်း မြန်မြန်ရွေ့နေပါတယ်"
              className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pb-7 text-[15px] leading-relaxed text-foreground focus:border-primary focus:outline-none"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">
              {note.length} / 150
            </span>
          </div>
        </Field>

        {/* Trust preview */}
        <TrustCard trust={trust} />

        {error ? (
          <p className="rounded-xl bg-soldout/10 px-3 py-2 text-sm text-soldout">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="h-13 w-full min-h-[52px] rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_10px_25px_-10px_var(--primary)] transition active:scale-[.98]"
        >
          တင်ပြမယ် · Submit report
        </button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Community information ဖြစ်ပြီး official station information မဟုတ်ပါ။
        </p>
      </form>
    </AppShell>
  );
}

// ============ Sub-components =======================================

function Field({
  label,
  en,
  hint,
  children,
}: {
  label: string;
  en?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <span className="text-[13px] font-bold text-foreground">
          {label}
          {en ? (
            <span className="ml-1 font-medium text-muted-foreground">
              · {en}
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PresenceCard({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[86px] flex-col justify-between rounded-2xl border p-3 text-left transition ${
        active
          ? "border-primary bg-primary/8 shadow-[inset_0_0_0_1px_var(--primary)]"
          : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
          active ? "border-primary" : "border-border"
        }`}
        aria-hidden
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${active ? "bg-primary" : ""}`}
        />
      </span>
      <span className="mt-2 text-[13px] font-bold leading-snug text-foreground">
        {title}
      </span>
    </button>
  );
}

function VerificationCard({
  state,
  message,
  onVerify,
  disabled,
}: {
  state: VerifyState;
  message: string;
  onVerify: () => void;
  disabled: boolean;
}) {
  const isVerified = state === "verified";
  const isFailed = state === "failed";
  const tone = isVerified
    ? "border-available/30 bg-available/10"
    : isFailed
      ? "border-limited/30 bg-limited/15"
      : "border-border bg-card";

  const title = isVerified
    ? "တည်နေရာအတည်ပြုပြီး"
    : isFailed
      ? "တည်နေရာမအတည်ပြုနိုင်ပါ"
      : "တည်နေရာအတည်ပြုရန်";

  const Icon = isVerified
    ? ShieldCheck
    : isFailed
      ? AlertTriangle
      : MapPin;

  return (
    <div className={`mt-2 rounded-2xl border p-3 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              isVerified
                ? "text-available"
                : isFailed
                  ? "text-limited-foreground"
                  : "text-muted-foreground"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground">{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onVerify}
          disabled={disabled || state === "checking"}
          className={`h-10 shrink-0 rounded-xl px-3 text-[11px] font-bold transition disabled:opacity-50 ${
            isVerified
              ? "border border-available/30 bg-card text-available"
              : "bg-available text-available-foreground"
          }`}
        >
          {state === "checking" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              စစ်ဆေးနေ
            </span>
          ) : isVerified ? (
            "အတည်ပြုပြီး"
          ) : isFailed ? (
            "ပြန်စစ်မယ်"
          ) : (
            "အတည်ပြုမယ်"
          )}
        </button>
      </div>
    </div>
  );
}

function ChipRadio({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border px-4 text-[13px] font-bold transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_var(--primary)]"
          : "border-border bg-card text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`}
    >
      {label}
    </button>
  );
}

function StatusChip({
  tone,
  active,
  onClick,
  label,
}: {
  tone: "available" | "limited" | "sold" | "closed";
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const activeCls =
    tone === "available"
      ? "border-available bg-available text-available-foreground"
      : tone === "limited"
        ? "border-limited bg-limited text-limited-foreground"
        : tone === "sold"
          ? "border-soldout bg-soldout text-soldout-foreground"
          : "border-closed bg-closed text-closed-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-[13px] font-bold transition ${
        active ? activeCls : "border-border bg-card text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function TrustCard({ trust }: { trust: Trust }) {
  const high = trust.level === "High";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 pl-14 ${
        high
          ? "border-available/25 bg-gradient-to-br from-available/12 to-available/5"
          : "border-limited/30 bg-gradient-to-br from-limited/20 to-limited/5"
      }`}
    >
      <span
        className={`absolute left-3 top-4 grid h-8 w-8 place-items-center rounded-xl text-[10px] font-black text-white ${
          high ? "bg-available" : "bg-limited"
        }`}
        aria-hidden
      >
        {high ? "OK" : "MED"}
      </span>
      <div className="flex items-start justify-between gap-3">
        <strong className="text-[12px] text-foreground">Report ယုံကြည်မှု</strong>
        <span
          className={`whitespace-nowrap text-[10px] font-black ${
            high ? "text-available" : "text-limited-foreground"
          }`}
        >
          {high ? "ယုံကြည်မှုမြင့်" : "အလယ်အလတ်"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {trust.text}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <TrustTag>{trust.sourceTag}</TrustTag>
        <TrustTag>{trust.freshnessTag}</TrustTag>
        <TrustTag>Community report</TrustTag>
      </div>
    </div>
  );
}

function TrustTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-card/80 px-1.5 py-1 text-[9px] font-bold text-foreground">
      {children}
    </span>
  );
}

// ============ Success view =========================================

interface SubmittedSummary {
  stationName: string;
  stationTownship: string;
  fuelType: FuelType;
  status: FuelStatus;
  queue: QueueLength | null;
  observation: string;
  verification: string;
  trustLevel: "High" | "Medium";
}

function SuccessView({
  summary,
  onAnother,
  onViewStation,
}: {
  summary: SubmittedSummary;
  onAnother: () => void;
  onViewStation: () => void;
}) {
  return (
    <div className="pt-4">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 rotate-[-6deg] place-items-center rounded-3xl bg-available text-available-foreground shadow-[0_16px_30px_-12px_var(--available)]">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-foreground">မျှဝေပြီးပါပြီ</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          သင့်အချက်အလက်က အနီးအနားယာဉ်မောင်းတွေကို ကူညီပေးနေပါပြီ။
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-left">
        <SummaryRow label="ဆီဆိုင်" value={summary.stationName} />
        <SummaryRow label="Township" value={summary.stationTownship || "—"} />
        <SummaryRow label="ဆီအမျိုးအစား" value={summary.fuelType} />
        <SummaryRow
          label="အခြေအနေ"
          value={STATUS_LABEL[summary.status]}
        />
        <SummaryRow
          label="တန်းစီယာဉ်"
          value={summary.queue ? QUEUE_LABEL[summary.queue] : "မလိုအပ်ပါ"}
        />
        <SummaryRow label="မြင်တွေ့ချိန်" value={summary.observation} />
        <SummaryRow
          label="အတည်ပြုမှု"
          value={summary.verification}
        />
        <SummaryRow
          label="ယုံကြည်မှု"
          value={summary.trustLevel === "High" ? "မြင့်" : "အလယ်အလတ်"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onViewStation}
          className="h-11 rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          Station ကြည့်မယ်
        </button>
        <button
          onClick={onAnother}
          className="h-11 rounded-full border border-border bg-card text-sm font-bold text-foreground"
        >
          နောက်ထပ်တင်မယ်
        </button>
      </div>
      <p className="mt-3 flex items-start justify-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="mt-0.5 h-3 w-3" aria-hidden />
        <span>Community report အပေါ် အခြေခံပါသည်။</span>
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-2 text-[12px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <strong className="max-w-[60%] text-right font-bold text-foreground">
        {value}
      </strong>
    </div>
  );
}
