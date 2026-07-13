import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, List, Map as MapIcon } from "lucide-react";
import { AppShell, BrandHeader } from "@/components/fuel/AppShell";
import { FuelFilter } from "@/components/fuel/FuelFilter";
import { StationCard } from "@/components/fuel/StationCard";
import { StationMap } from "@/components/fuel/StationMap";
import { useFuelStore } from "@/lib/fuel/store";
import type { FuelType } from "@/lib/fuel/types";
import {
  deriveFuelState,
  deriveStationStates,
  distanceKm,
} from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";

export const Route = createFileRoute("/")({
  component: DiscoverPage,
});

function DiscoverPage() {
  const { stations, reports } = useFuelStore();
  const [fuel, setFuel] = useState<FuelType | "All">("All");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"map" | "list">("map");

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
      .sort((a, b) => a.distance - b.distance);
  }, [stations, reports, fuel, q]);

  const pins = rows.map((r) => ({
    station: r.station,
    status: r.state?.status ?? null,
  }));

  return (
    <AppShell>
      <BrandHeader />

      <label className="relative mb-3 block">
        <span className="sr-only">Search stations</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ဆီဆိုင်ရှာရန် · Search stations, township"
          className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </label>

      <div className="mb-3">
        <FuelFilter value={fuel} onChange={setFuel} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} stations · {fuel === "All" ? "All fuels" : fuel}
        </p>
        <div
          role="tablist"
          aria-label="View mode"
          className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-medium"
        >
          <button
            role="tab"
            aria-selected={view === "map"}
            onClick={() => setView("map")}
            className={`inline-flex h-8 items-center gap-1 rounded-full px-3 ${
              view === "map" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" aria-hidden /> Map
          </button>
          <button
            role="tab"
            aria-selected={view === "list"}
            onClick={() => setView("list")}
            className={`inline-flex h-8 items-center gap-1 rounded-full px-3 ${
              view === "list" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" aria-hidden /> List
          </button>
        </div>
      </div>

      {view === "map" ? (
        <div className="mb-4">
          <StationMap pins={pins} center={MANDALAY_CENTER} />
        </div>
      ) : null}

      <h2 className="mb-2 text-sm font-semibold text-foreground">
        အနီးရှိ ဆီဆိုင်များ · Nearby stations
      </h2>
      <div className="space-y-2.5">
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
    </AppShell>
  );
}
