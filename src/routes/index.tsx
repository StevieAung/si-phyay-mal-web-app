import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  Fuel,
  UserRound,
  MapPin,
  Locate,
  X,
} from "lucide-react";
import { BottomNav } from "@/components/fuel/BottomNav";
import { StationCard } from "@/components/fuel/StationCard";
import { StationMap } from "@/components/fuel/StationMap";
import { useFuelStore } from "@/lib/fuel/store";
import type { FuelType, FuelStatus } from "@/lib/fuel/types";
import { FUEL_TYPES, FUEL_STATUSES } from "@/lib/fuel/types";
import {
  deriveFuelState,
  deriveStationStates,
  distanceKm,
} from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";
import { useSession } from "@/lib/fuel/session";
import { useGeolocation } from "@/hooks/useGeolocation";
import { maskPhone } from "@/lib/fuel/phone";
import { useFillHistory } from "@/lib/fuel/fillHistory";
import { LogFillModal } from "@/components/fuel/LogFillModal";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: DiscoverPage,
});

const STATUS_META: Record<FuelStatus, { my: string; dot: string }> = {
  Available: { my: "ရရှိနိုင်သည်", dot: "bg-available" },
  Limited: { my: "အကန့်အသတ်ရှိ", dot: "bg-limited" },
  "Sold Out": { my: "ကုန်နေပြီ", dot: "bg-soldout" },
  Closed: { my: "ပိတ်ထားသည်", dot: "bg-closed" },
};

const LEGEND_LABEL: Record<FuelStatus, string> = {
  Available: "ရရှိနိုင်သည်",
  Limited: "အကန့်အသတ်ရှိ",
  "Sold Out": "ကုန်နေပြီ",
  Closed: "ပိတ်ထားသည်",
};

type Radius = 2 | 5 | 10 | "all";
const RADIUS_OPTIONS: { value: Radius; label: string }[] = [
  { value: 2, label: "2 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: "all", label: "အားလုံး · All" },
];

function DiscoverPage() {
  const { stations, reports } = useFuelStore();
  const [fuel, setFuel] = useState<FuelType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<FuelStatus | "All">("All");
  const [q, setQ] = useState("");
  const [radius, setRadius] = useState<Radius>(2);
  const [showExplainer, setShowExplainer] = useState(false);
  const [explainerDismissed, setExplainerDismissed] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const geo = useGeolocation();
  const { profile, openSheet, requireCompleteProfile } = useSession();
  const { entries: fills, addFill } = useFillHistory();
  const [logOpen, setLogOpen] = useState(false);

  function onTapLogFill() {
    requireCompleteProfile({
      kind: "confirm",
      onResume: () => setLogOpen(true),
    });
  }

  // Show the in-app explanation on first Discover visit only.
  useEffect(() => {
    if (!explainerDismissed && geo.status === "idle") setShowExplainer(true);
  }, [explainerDismissed, geo.status]);

  const origin = geo.coords ?? MANDALAY_CENTER;

  const rowsAll = useMemo(() => {
    const query = q.trim().toLowerCase();
    return stations
      .filter((s) => (fuel === "All" ? true : s.offeredFuels.includes(fuel)))
      .filter((s) =>
        query
          ? s.name.toLowerCase().includes(query) ||
            s.nameEn.toLowerCase().includes(query) ||
            s.township.toLowerCase().includes(query)
          : true,
      )
      .map((s) => {
        const state =
          fuel === "All"
            ? deriveStationStates(s, reports)[0] ?? null
            : deriveFuelState(s, fuel, reports);
        return {
          station: s,
          state,
          distance: distanceKm(origin, { lat: s.lat, lng: s.lng }),
        };
      })
      .filter((r) =>
        statusFilter === "All" ? true : r.state?.status === statusFilter,
      )
      .sort((a, b) => a.distance - b.distance);
  }, [stations, reports, fuel, statusFilter, q, origin]);

  const radiusActive = geo.coords && radius !== "all";
  const rowsInRadius = useMemo(
    () =>
      radiusActive
        ? rowsAll.filter((r) => r.distance <= (radius as number))
        : rowsAll,
    [rowsAll, radiusActive, radius],
  );

  const showAllFallback = radiusActive && rowsInRadius.length === 0;
  const rows = showAllFallback ? rowsAll : rowsInRadius;
  const visibleRows = showAllNearby ? rows : rows.slice(0, 4);
  const remainingCount = Math.max(0, rows.length - visibleRows.length);
  const pins = rows.map((r) => ({
    station: r.station,
    status: r.state?.status ?? null,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto overscroll-contain">

        {/* Header */}
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_2px_6px_rgba(216,67,21,0.35)]"
            >
              <Fuel className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                ဆီဖြည့်မယ်
              </h1>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                ဆီရှိတဲ့နေရာ သိပြီး၊ ဆီဖြည့်မယ်။
              </p>
              <p className="truncate text-[11px] text-muted-foreground/80">
                Community fuel map · Mandalay
              </p>
            </div>
            <AccountButton profileName={profile?.name ?? null} maskedPhone={profile ? maskPhone(profile.phoneE164) : null} onClick={() => openSheet()} />
          </div>

          {/* Search */}
          <label className="relative mt-3 block">
            <span className="sr-only">Search stations</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ဆီဆိုင်ရှာရန် / Search stations..."
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-[0_1px_2px_rgba(24,32,43,0.04)] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>

          {/* Fuel filter row */}
          <div
            role="tablist"
            aria-label="Fuel type"
            className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto"
          >
            <FilterChip
              active={fuel === "All"}
              onClick={() => setFuel("All")}
              label="ဆီအမျိုးအားလုံး"
            />
            {FUEL_TYPES.map((f) => (
              <FilterChip
                key={f}
                active={fuel === f}
                onClick={() => setFuel(f)}
                label={f}
              />
            ))}
          </div>

          {/* Status filter row */}
          <div
            role="tablist"
            aria-label="Status"
            className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto"
          >
            <FilterChip
              active={statusFilter === "All"}
              onClick={() => setStatusFilter("All")}
              label="အခြေအနေအားလုံး"
            />
            {FUEL_STATUSES.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={STATUS_META[s].my}
                dotClass={STATUS_META[s].dot}
              />
            ))}
          </div>

          {/* Location bar */}
          <LocationBar
            geo={geo}
            radius={radius}
            setRadius={setRadius}
            onEnable={() => setShowExplainer(true)}
          />
        </header>

        {/* Map + sheet */}
        <section className="relative flex-1">
          <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden border-y border-border">
            <StationMap
              pins={pins}
              center={geo.coords ?? MANDALAY_CENTER}
              userLocation={geo.coords}
              radiusKm={radiusActive ? (radius as number) : null}
            />

            {/* Legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-2xl border border-border bg-card/90 px-3 py-2 text-[11px] shadow-md backdrop-blur-sm">
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                {FUEL_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`}
                      aria-hidden
                    />
                    <span className="text-foreground">{LEGEND_LABEL[s]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/ask"
              className="absolute right-3 top-3 z-[400] inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Ask assistant"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span>AI လမ်းညွှန်</span>
            </Link>
          </div>

          {/* Nearby stations sheet */}
          <div className="relative -mt-6 rounded-t-[28px] border-t border-border bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(24,32,43,0.15)]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border" aria-hidden />
            <div className="px-4">
              <h2 className="text-base font-semibold text-foreground">
                အနီးဆုံး ဆီဆိုင်များ
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Nearby stations · {rows.length} results
                {radiusActive && !showAllFallback ? ` · within ${radius} km` : ""}
              </p>

              {showAllFallback && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-[12px]">
                  <span className="text-foreground">
                    ရွေးထားသော {radius} km အတွင်း မတွေ့ရှိပါ။ အားလုံးပြပါ။
                  </span>
                  <button
                    onClick={() => setRadius("all")}
                    className="h-8 rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground"
                  >
                    Show all
                  </button>
                </div>
              )}

              <div className="mt-3 space-y-2.5">
                {rows.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    No stations match / တွေ့ရှိမှုမရှိပါ
                  </p>
                ) : (
                  rows.map((r) => (
                    <StationCard
                      key={r.station.id}
                      station={r.station}
                      state={r.state}
                      distanceKm={r.distance}
                    />
                  ))
                )}
              </div>

              {/* Log-fill CTA */}
              <button
                type="button"
                onClick={onTapLogFill}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-105"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                ဒီနေ့ ဆီထည့်ပြီးပြီလား ခင်ဗျာ
              </button>
              {!profile && (
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  မှတ်တမ်းတင်ရန် အကောင့်ဝင်ရန်လိုအပ်သည်
                </p>
              )}

              {/* Fill history */}
              {profile && fills.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    ကျွန်ုပ်၏ ဆီဖြည့်မှတ်တမ်း
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {fills.slice(0, 5).map((f) => (
                      <li
                        key={f.id}
                        className="rounded-2xl border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(f.ts).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            {f.fuelType}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {f.stationName}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[12px]">
                          <span className="text-muted-foreground">{f.liters} L</span>
                          <span className="font-semibold text-primary">
                            {f.total.toLocaleString("en-US")} ကျပ်
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {logOpen && profile && (
        <LogFillModal
          stations={stations}
          defaultFuel={profile.fuelType}
          onClose={() => setLogOpen(false)}
          onSubmit={(entry) => {
            addFill(entry);
            setLogOpen(false);
          }}
        />
      )}

      {showExplainer && geo.status === "idle" && (
        <LocationExplainer
          onAllow={() => {
            setShowExplainer(false);
            setExplainerDismissed(true);
            geo.request();
          }}
          onDecline={() => {
            setShowExplainer(false);
            setExplainerDismissed(true);
          }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function AccountButton({
  profileName,
  maskedPhone,
  onClick,
}: {
  profileName: string | null;
  maskedPhone: string | null;
  onClick: () => void;
}) {
  const signedIn = !!profileName;
  return (
    <button
      onClick={onClick}
      aria-label={signedIn ? "Account" : "အချက်အလက်ဖြည့်ရန်"}
      className={`shrink-0 inline-flex h-10 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition ${
        signedIn
          ? "border-border bg-card text-foreground"
          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
      }`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-full ${
          signedIn ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        {signedIn ? (
          <span className="text-[12px] font-bold">
            {profileName!.trim().charAt(0).toUpperCase() || "•"}
          </span>
        ) : (
          <UserRound className="h-4 w-4" aria-hidden />
        )}
      </span>
      <span className="hidden truncate whitespace-nowrap sm:inline">
        {signedIn ? maskedPhone ?? "Account" : "အချက်အလက်ဖြည့်ရန်"}
      </span>
    </button>
  );
}

function LocationBar({
  geo,
  radius,
  setRadius,
  onEnable,
}: {
  geo: ReturnType<typeof useGeolocation>;
  radius: Radius;
  setRadius: (r: Radius) => void;
  onEnable: () => void;
}) {
  if (geo.status === "granted") {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          <span>လက်ရှိတည်နေရာအတိုင်း ရှာဖွေထား · Using your location</span>
        </div>
        <div
          role="tablist"
          aria-label="Radius"
          className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto"
        >
          {RADIUS_OPTIONS.map((o) => (
            <FilterChip
              key={String(o.value)}
              active={radius === o.value}
              onClick={() => setRadius(o.value)}
              label={o.label}
            />
          ))}
        </div>
      </div>
    );
  }

  if (geo.status === "requesting") {
    return (
      <p className="mt-3 text-[11px] text-muted-foreground">
        တည်နေရာ တောင်းဆိုနေသည် · Requesting location…
      </p>
    );
  }

  if (geo.status === "idle") {
    return (
      <button
        type="button"
        onClick={onEnable}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-[12px] font-medium text-primary"
      >
        <Locate className="h-4 w-4" aria-hidden />
        တည်နေရာဖွင့်ရန် · Use my location
      </button>
    );
  }

  // denied / unavailable / timeout / unsupported
  const msg =
    geo.status === "denied"
      ? "တည်နေရာ ခွင့်ပြုမပေးထားပါ · Location permission denied."
      : geo.status === "unsupported"
        ? "ဤ browser တွင် တည်နေရာ မထောက်ပံ့ပါ · Not supported."
        : geo.status === "timeout"
          ? "အချိန်ကုန်သွားသည် · Location request timed out."
          : "တည်နေရာ မရရှိပါ · Location unavailable.";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-[12px]">
      <span className="text-foreground">{msg} မန္တလေးမြေပုံဖြင့် ဆက်ကြည့်နိုင်ပါသည်။</span>
      {geo.status !== "unsupported" && (
        <button
          onClick={() => {
            geo.reset();
            onEnable();
          }}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-[12px] font-medium text-primary-foreground"
        >
          <Locate className="h-3.5 w-3.5" aria-hidden />
          Retry location
        </button>
      )}
    </div>
  );
}

function LocationExplainer({
  onAllow,
  onDecline,
}: {
  onAllow: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Location permission"
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">
            တည်နေရာ သုံးခွင့် · Use your location?
          </h2>
          <button
            onClick={onDecline}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-foreground">
          အနီးဆုံး ဆီဆိုင်များကိုသာ ရှာဖွေရန် အသုံးပြုပါသည်။ တည်နေရာအား သိမ်းဆည်းထားခြင်း မရှိပါ။
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Used only to find nearby stations. Your coordinates are not saved.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onDecline}
            className="h-11 rounded-full border border-border bg-background text-sm font-medium text-foreground"
          >
            Not now
          </button>
          <button
            onClick={onAllow}
            className="h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            ခွင့်ပြု · Allow
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass?: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:bg-secondary"
      }`}
    >
      {dotClass ? (
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      ) : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
