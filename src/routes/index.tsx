import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles, Fuel } from "lucide-react";
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

export const Route = createFileRoute("/")({
  component: DiscoverPage,
});

const STATUS_META: Record<
  FuelStatus,
  { my: string; dot: string }
> = {
  Available: { my: "ရနိုင်သည်", dot: "bg-available" },
  Limited: { my: "အနည်းငယ်ရှိ", dot: "bg-limited" },
  "Sold Out": { my: "ကုန်ဆုံး", dot: "bg-soldout" },
  Closed: { my: "ပိတ်ထားသည်", dot: "bg-closed" },
};

function DiscoverPage() {
  const { stations, reports } = useFuelStore();
  const [fuel, setFuel] = useState<FuelType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<FuelStatus | "All">("All");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
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
          distance: distanceKm(MANDALAY_CENTER, { lat: s.lat, lng: s.lng }),
        };
      })
      .filter((r) =>
        statusFilter === "All"
          ? true
          : r.state?.status === statusFilter,
      )
      .sort((a, b) => a.distance - b.distance);
  }, [stations, reports, fuel, statusFilter, q]);

  const pins = rows.map((r) => ({
    station: r.station,
    status: r.state?.status ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
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
        </header>

        {/* Map + sheet */}
        <section className="relative flex-1">
          <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden border-y border-border">
            <StationMap pins={pins} center={MANDALAY_CENTER} />

            {/* Legend */}
            <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-2xl border border-border bg-card/95 px-3 py-2 text-[11px] shadow-md backdrop-blur">
              <ul className="space-y-1">
                {FUEL_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`}
                      aria-hidden
                    />
                    <span className="text-foreground">{STATUS_META[s].my}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating Ask launcher */}
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
          <div className="relative -mt-6 rounded-t-[28px] border-t border-border bg-background pb-24 pt-3 shadow-[0_-8px_24px_-12px_rgba(24,32,43,0.15)]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border" aria-hidden />
            <div className="px-4">
              <h2 className="text-base font-semibold text-foreground">
                အနီးဆုံး ဆီဆိုင်များ
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Nearby stations · {rows.length} results
              </p>

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
            </div>
          </div>
        </section>
      </main>
      <div className="mx-auto w-full max-w-lg">
        <BottomNav />
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
        <span
          className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
          aria-hidden
        />
      ) : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
