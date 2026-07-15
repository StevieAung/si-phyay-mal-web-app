import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  MapPin,
  Navigation,
  PlusCircle,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/fuel/AppShell";
import { useFuelStore } from "@/lib/fuel/store";
import { useSession } from "@/lib/fuel/session";
import {
  deriveStationStates,
  distanceKm,
  formatRelativeTime,
} from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";
import { useGeolocation } from "@/hooks/useGeolocation";
import type {
  Confidence,
  FuelState,
  FuelType,
  QueueLength,
  Report,
} from "@/lib/fuel/types";

export const Route = createFileRoute("/station/$id")({
  component: StationDetail,
  notFoundComponent: NotFoundBody,
});

const FRESH_MS = 30 * 60_000;
const STALE_MS = 60 * 60_000;

const STATUS_MY: Record<string, string> = {
  Available: "ရရှိနေသည်",
  Limited: "ဆီနည်းနေသည်",
  "Sold Out": "ရောင်းကုန်ပြီ",
  Closed: "ဆိုင်ပိတ်ထားသည်",
};

const QUEUE_MY: Record<QueueLength, string> = {
  "No Queue": "တန်းမရှိ",
  Short: "၁–၁၀ စီး",
  Medium: "၁၁–၃၀ စီး",
  Long: "၃၀ စီးကျော်",
};

function StationDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const { stations, reports, confirmReport, canConfirm } = useFuelStore();
  const { profile, requireCompleteProfile } = useSession();

  const station = stations.find((s) => s.id === id);
  if (!station) throw notFound();

  const now = Date.now();
  const states = useMemo(
    () => deriveStationStates(station, reports, now),
    [station, reports, now],
  );

  const stationReports = useMemo(
    () =>
      [...reports]
        .filter((r) => r.stationId === station.id)
        .sort((a, b) => b.timestamp - a.timestamp),
    [reports, station.id],
  );

  const latestByFuel = useMemo(() => {
    const map = new Map<FuelType, Report>();
    for (const r of stationReports) if (!map.has(r.fuelType)) map.set(r.fuelType, r);
    return map;
  }, [stationReports]);

  const timeline = stationReports.slice(0, 6);

  const origin = geo.coords ?? MANDALAY_CENTER;
  const dist = distanceKm(origin, { lat: station.lat, lng: station.lng });

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`;

  // Community pulse aggregate
  const pulse = useMemo(() => {
    const recent = stationReports.filter((r) => now - r.timestamp <= FRESH_MS);
    const confirmations = recent.reduce(
      (sum, r) => sum + r.confirmationCount,
      0,
    );
    const overall = pickOverallConfidence(states);
    const latestTs = stationReports[0]?.timestamp;
    return {
      recentCount: recent.length,
      confirmations,
      overall,
      latestTs,
    };
  }, [stationReports, states, now]);

  return (
    <AppShell>
      <header className="mb-3 flex items-center gap-3">
        <button
          onClick={() => router.history.back()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
            {station.name}
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">
            Community station detail
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
            pulse.recentCount > 0
              ? "bg-available/15 text-available"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {pulse.recentCount > 0 ? "LIVE DATA" : "STALE"}
        </span>
      </header>

      {/* Station card */}
      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-primary"
            aria-hidden
          >
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-snug text-foreground">
              {station.address}
              {station.township ? `၊ ${station.township}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              လက်ရှိနေရာမှ {dist.toFixed(1)} km ခန့်
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              requireCompleteProfile({
                kind: "directions",
                stationId: station.id,
                directionsUrl,
                onResume: () =>
                  window.open(directionsUrl, "_blank", "noopener,noreferrer"),
              })
            }
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <Navigation className="h-4 w-4" aria-hidden />
            လမ်းညွှန်
          </button>
          <button
            type="button"
            onClick={() =>
              requireCompleteProfile({
                kind: "report",
                stationId: station.id,
                onResume: () =>
                  navigate({ to: "/report", search: { stationId: station.id } }),
              })
            }
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-primary bg-card text-sm font-bold text-primary"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            အခြေအနေတင်မယ်
          </button>
        </div>
      </section>

      {/* Community pulse */}
      <CommunityPulse pulse={pulse} nowMs={now} />

      {/* Fuel cards */}
      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[15px] font-bold text-foreground">
          ဆီအမျိုးအစားအလိုက်
        </h2>
        <span className="text-[10px] text-muted-foreground">
          တစ်ခုချင်းနှိပ်ကြည့်ပါ
        </span>
      </div>

      <div className="mt-2.5 grid gap-2.5">
        {station.offeredFuels.map((f) => {
          const state = states.find((s) => s.fuelType === f) ?? null;
          const latest = latestByFuel.get(f) ?? null;
          return (
            <FuelCard
              key={f}
              fuelType={f}
              state={state}
              latest={latest}
              nowMs={now}
              stationId={station.id}
              canConfirm={canConfirm}
              onConfirm={async (reportId) => {
                return new Promise((resolve) => {
                  requireCompleteProfile({
                    kind: "confirm",
                    stationId: station.id,
                    onResume: async () => {
                      if (!profile) {
                        resolve({ ok: false });
                        return;
                      }
                      const res = await confirmReport(reportId, profile.id);
                      if (res.ok) toast.success("အတည်ပြုပြီး · Thanks");
                      else if (res.cooldownRemainingMs)
                        toast("ခဏစောင့်ပါ · try again in a moment");
                      resolve(res);
                    },
                  });
                  if (!profile) resolve({ ok: false });
                });
              }}
              onReportUpdate={() =>
                requireCompleteProfile({
                  kind: "report",
                  stationId: station.id,
                  onResume: () =>
                    navigate({
                      to: "/report",
                      search: { stationId: station.id },
                    }),
                })
              }
            />
          );
        })}
      </div>

      {/* Timeline */}
      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[15px] font-bold text-foreground">
          နောက်ဆုံး Community Reports
        </h2>
        <span className="text-[10px] text-muted-foreground">Evidence history</span>
      </div>

      {timeline.length === 0 ? (
        <p className="mt-2.5 rounded-2xl border border-dashed border-border bg-card p-5 text-center text-[12px] text-muted-foreground">
          အစီရင်ခံစာ မရှိသေးပါ · No reports yet.
        </p>
      ) : (
        <ol className="mt-3 grid gap-0 pl-2">
          {timeline.map((r, idx) => (
            <TimelineItem
              key={r.id}
              report={r}
              isLast={idx === timeline.length - 1}
              nowMs={now}
              latestStatusForFuel={latestByFuel.get(r.fuelType)?.status}
            />
          ))}
        </ol>
      )}

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        ဤအချက်အလက်များသည် community reports အပေါ်အခြေခံပြီး official station
        information မဟုတ်ပါ။
      </p>
    </AppShell>
  );
}

// ============ Community Pulse ======================================

function CommunityPulse({
  pulse,
  nowMs,
}: {
  pulse: {
    recentCount: number;
    confirmations: number;
    overall: Confidence | null;
    latestTs: number | undefined;
  };
  nowMs: number;
}) {
  const tone =
    pulse.overall === "High"
      ? "border-available/25 bg-gradient-to-br from-available/15 to-available/5"
      : pulse.overall === "Conflicting"
        ? "border-limited/30 bg-gradient-to-br from-limited/20 to-limited/5"
        : "border-border bg-card";

  const badge =
    pulse.overall === "High"
      ? { label: "ယုံကြည်မှုမြင့်", cls: "text-available" }
      : pulse.overall === "Medium"
        ? { label: "အလယ်အလတ်", cls: "text-limited-foreground" }
        : pulse.overall === "Conflicting"
          ? { label: "မသေချာ", cls: "text-soldout" }
          : { label: "မကြာမီ report မရှိ", cls: "text-muted-foreground" };

  const description =
    pulse.recentCount > 0
      ? `နောက်ဆုံး ၃၀ မိနစ်အတွင်း ဆိုင်အနီးမှတင်ထားသော အချက်အလက် ${pulse.recentCount} ခုရှိပါတယ်။`
      : "မကြာသေးခင်က community report မရှိသေးပါ။";

  return (
    <section className={`mt-3 rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <strong className="text-[12px] text-foreground">Community pulse</strong>
        <span className={`text-[10px] font-black ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <PulseTag>Reports {pulse.recentCount}</PulseTag>
        <PulseTag>Confirmations {pulse.confirmations}</PulseTag>
        {pulse.latestTs ? (
          <PulseTag>နောက်ဆုံး · {formatRelativeTime(pulse.latestTs, nowMs)}</PulseTag>
        ) : null}
      </div>
    </section>
  );
}

function PulseTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-card/80 px-1.5 py-1 text-[9px] font-bold text-foreground">
      {children}
    </span>
  );
}

// ============ Fuel card ============================================

function FuelCard({
  fuelType,
  state,
  latest,
  nowMs,
  canConfirm,
  onConfirm,
  onReportUpdate,
}: {
  fuelType: FuelType;
  state: FuelState | null;
  latest: Report | null;
  nowMs: number;
  stationId: string;
  canConfirm: (id: string) => boolean;
  onConfirm: (
    id: string,
  ) => Promise<{ ok: boolean; cooldownRemainingMs?: number }>;
  onReportUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);

  const ageMs = state ? nowMs - state.updatedAt : Infinity;
  const stale = !state || ageMs > STALE_MS;
  const conflict = state?.confidence === "Conflicting";
  const fresh = state && ageMs <= FRESH_MS;

  let summaryTitle = "အခြေအနေမသိသေး";
  let summarySub = "အချက်အလက် မရှိသေးပါ";
  let statusPill: {
    label: string;
    cls: string;
  } = { label: "မသိရသေး", cls: "bg-muted text-muted-foreground" };

  if (stale) {
    summaryTitle = "Recent data မရှိသေးပါ";
    summarySub = state
      ? `နောက်ဆုံး report ${formatRelativeTime(state.updatedAt, nowMs)}`
      : "အစီရင်ခံစာ မရှိသေးပါ";
    statusPill = { label: "မသိရသေး", cls: "bg-muted text-muted-foreground" };
  } else if (conflict) {
    summaryTitle = "အချက်အလက် ကွဲလွဲနေသည်";
    summarySub = "လတ်တလော reports မကိုက်ညီပါ";
    statusPill = { label: "မသေချာ", cls: "bg-limited text-limited-foreground" };
  } else if (state) {
    summaryTitle =
      fresh && state.confidence === "High"
        ? "လက်ရှိ ရနိုင်ခြေမြင့်"
        : STATUS_MY[state.status];
    summarySub = `${formatRelativeTime(state.updatedAt, nowMs)}${
      state.confirmations > 0 ? ` · ${state.confirmations} confirmations` : ""
    }`;
    const tone =
      state.status === "Available"
        ? "bg-available text-available-foreground"
        : state.status === "Limited"
          ? "bg-limited text-limited-foreground"
          : state.status === "Sold Out"
            ? "bg-soldout text-soldout-foreground"
            : "bg-closed text-closed-foreground";
    statusPill = { label: STATUS_MY[state.status], cls: tone };
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border bg-card transition ${
        open ? "shadow-[0_10px_25px_-15px_rgba(24,32,43,.35)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-[13px] font-black text-foreground">
          {fuelType === "Premium Diesel" ? "PD" : fuelType}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-bold text-foreground">
            {summaryTitle}
          </strong>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {summarySub}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${statusPill.cls}`}
          >
            {statusPill.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div className="px-3.5 pb-3.5">
          {stale ? (
            <StaleBox onReportUpdate={onReportUpdate} />
          ) : conflict ? (
            <ConflictBox
              fuelType={fuelType}
              onReportUpdate={onReportUpdate}
            />
          ) : state && latest ? (
            <EvidenceBox
              state={state}
              latest={latest}
              nowMs={nowMs}
              canConfirm={canConfirm}
              onConfirm={onConfirm}
              onReportUpdate={onReportUpdate}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EvidenceBox({
  state,
  latest,
  nowMs,
  canConfirm,
  onConfirm,
  onReportUpdate,
}: {
  state: FuelState;
  latest: Report;
  nowMs: number;
  canConfirm: (id: string) => boolean;
  onConfirm: (
    id: string,
  ) => Promise<{ ok: boolean; cooldownRemainingMs?: number }>;
  onReportUpdate: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const ageMs = nowMs - state.updatedAt;
  const validityMs = state.status === "Limited" ? 15 * 60_000 : 20 * 60_000;
  const pct = Math.max(
    0,
    Math.min(100, ((validityMs - ageMs) / validityMs) * 100),
  );
  const remainingMin = Math.max(0, Math.round((validityMs - ageMs) / 60_000));

  const disabled = confirming || confirmed || !canConfirm(latest.id);

  async function handleConfirm() {
    if (disabled) return;
    setConfirming(true);
    const res = await onConfirm(latest.id);
    setConfirming(false);
    if (res.ok) setConfirmed(true);
  }

  return (
    <div className="rounded-2xl bg-secondary p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-[11px] text-foreground">
            {state.confirmations > 0
              ? "အသိုင်းအဝိုင်းက အတည်ပြုထားသည်"
              : "ဆိုင်အနီးမှ report ရရှိထားသည်"}
          </strong>
          <small className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
            {state.queue ? `ကားတန်း ${QUEUE_MY[state.queue]}` : "တန်းစီ မလိုအပ်"}
            {state.confirmations > 0
              ? ` · ယာဉ်မောင်း ${state.confirmations} ဦးအတည်ပြု`
              : ""}
          </small>
        </div>
        <span className="whitespace-nowrap text-[10px] font-black text-available">
          {ageMs <= FRESH_MS ? "လတ်ဆတ်" : "စောင့်ဆိုင်း"}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-available to-available/60"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground">
        <span>Report တင်ချိန်</span>
        <span>နောက် {remainingMin} မိနစ်ခန့် အသုံးဝင်နိုင်</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={disabled}
          className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[11px] font-black transition disabled:opacity-60 ${
            confirmed
              ? "border border-available bg-available text-available-foreground"
              : "border border-available/30 bg-card text-available"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
          {confirmed
            ? "အတည်ပြုပြီး"
            : `ဒီအခြေအနေ မှန်နေဆဲ · ${state.confirmations + (confirmed ? 1 : 0)}`}
        </button>
        <button
          type="button"
          onClick={onReportUpdate}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-[11px] font-black text-foreground"
        >
          ပြောင်းသွားပြီ
        </button>
      </div>
    </div>
  );
}

function ConflictBox({
  fuelType,
  onReportUpdate,
}: {
  fuelType: FuelType;
  onReportUpdate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-limited/30 bg-limited/15 p-3">
      <h3 className="text-[11px] font-black text-foreground">
        လတ်တလော Reports မကိုက်ညီပါ
      </h3>
      <p className="mt-2 text-[10px] leading-relaxed text-limited-foreground/90">
        {fuelType} အတွက် လက်ရှိမှာ သေချာတဲ့ recommendation မပေးနိုင်သေးပါ။
        ဆိုင်ရောက်နေသူရဲ့ update လိုအပ်ပါတယ်။
      </p>
      <button
        type="button"
        onClick={onReportUpdate}
        className="mt-3 h-10 w-full rounded-xl bg-limited text-[11px] font-black text-limited-foreground"
      >
        အခုအခြေအနေ အတည်ပြုမယ်
      </button>
    </div>
  );
}

function StaleBox({ onReportUpdate }: { onReportUpdate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-center">
      <strong className="block text-[11px] font-black text-foreground">
        ဒီ data ကို ဆုံးဖြတ်ချက်အတွက် မသုံးသင့်ပါ
      </strong>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        အချက်အလက်ဟောင်းကို status အဖြစ်မပြတော့ဘဲ အသစ်တင်ရန်ဖိတ်ခေါ်ထားပါတယ်။
      </p>
      <button
        type="button"
        onClick={onReportUpdate}
        className="mt-3 h-10 rounded-xl bg-primary px-4 text-[11px] font-black text-primary-foreground"
      >
        အခြေအနေသစ် မျှဝေမယ်
      </button>
    </div>
  );
}

// ============ Timeline ============================================

function TimelineItem({
  report,
  isLast,
  nowMs,
  latestStatusForFuel,
}: {
  report: Report;
  isLast: boolean;
  nowMs: number;
  latestStatusForFuel: string | undefined;
}) {
  const conflicting =
    latestStatusForFuel && report.status !== latestStatusForFuel;
  const dotCls = conflicting ? "bg-limited" : "bg-available";
  return (
    <li
      className={`relative pl-5 ${isLast ? "" : "border-l border-border pb-3"}`}
    >
      <span
        className={`absolute left-[-4.5px] top-1 h-2.5 w-2.5 rounded-full ${dotCls} ring-2 ring-background`}
        aria-hidden
      />
      <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-[11px] font-bold text-foreground">
            {report.fuelType} · {STATUS_MY[report.status]}
          </strong>
          <time className="text-[10px] text-muted-foreground">
            {formatRelativeTime(report.timestamp, nowMs)}
          </time>
        </div>
        {report.queue ? (
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            တန်းစီ · {QUEUE_MY[report.queue]}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.confirmationCount > 0 ? (
            <TimelineTag>{report.confirmationCount} confirmations</TimelineTag>
          ) : null}
          {conflicting ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-limited/25 px-1.5 py-1 text-[9px] font-black text-limited-foreground">
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
              Conflicting
            </span>
          ) : (
            <TimelineTag>Community report</TimelineTag>
          )}
        </div>
      </div>
    </li>
  );
}

function TimelineTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-secondary px-1.5 py-1 text-[9px] font-bold text-foreground">
      {children}
    </span>
  );
}

// ============ Helpers ============================================

function pickOverallConfidence(states: FuelState[]): Confidence | null {
  if (states.length === 0) return null;
  if (states.some((s) => s.confidence === "Conflicting")) return "Conflicting";
  if (states.some((s) => s.confidence === "High")) return "High";
  if (states.some((s) => s.confidence === "Medium")) return "Medium";
  return "Low";
}

function NotFoundBody() {
  return (
    <AppShell>
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Station not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The station you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to Discover
        </Link>
      </div>
    </AppShell>
  );
}
