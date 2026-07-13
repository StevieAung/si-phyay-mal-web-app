import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { AppShell, BrandHeader } from "@/components/fuel/AppShell";
import { useFuelStore } from "@/lib/fuel/store";
import { rankForFuel, formatRelativeTime } from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";
import type { FuelType } from "@/lib/fuel/types";
import { StatusBadge } from "@/components/fuel/StatusBadge";
import { QueueBadge } from "@/components/fuel/QueueBadge";

const PROMPTS: { label: string; fuel: FuelType }[] = [
  { label: "Diesel with the shortest queue", fuel: "Diesel" },
  { label: "Where can I get 92?", fuel: "92" },
  { label: "Nearest 95 station", fuel: "95" },
  { label: "Premium Diesel nearby", fuel: "Premium Diesel" },
];

export const Route = createFileRoute("/ask")({
  component: AskPage,
});

function AskPage() {
  const { stations, reports } = useFuelStore();
  const [fuel, setFuel] = useState<FuelType | null>(null);

  const ranked = useMemo(() => {
    if (!fuel) return [];
    return rankForFuel(fuel, stations, reports, MANDALAY_CENTER).slice(0, 3);
  }, [fuel, stations, reports]);

  const top = ranked[0];

  return (
    <AppShell>
      <BrandHeader subtitle="မေးမြန်း · Ask the community assistant" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm text-foreground">
            မင်္ဂလာပါ! ဘယ်ဆီရှာနေတာလဲ? · Which fuel are you looking for?
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => setFuel(p.fuel)}
              className={`h-10 rounded-full border px-3 text-sm font-medium ${
                fuel === p.fuel
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {fuel && top ? (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-primary">
            Recommendation · အကြံပြုချက်
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground">
            {top.station.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {top.station.township} · {top.distanceKm.toFixed(1)} km
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {fuel}
            </span>
            <StatusBadge status={top.state.status} size="sm" />
            {top.state.queue ? <QueueBadge queue={top.state.queue} /> : null}
          </div>
          <p className="mt-3 text-sm text-foreground">
            I recommend <strong>{top.station.name}</strong> — it has{" "}
            <strong>{top.state.queue ?? "no queue"}</strong> for {fuel},
            last updated {formatRelativeTime(top.state.updatedAt)}, with{" "}
            {top.state.confirmations} matching community confirmation
            {top.state.confirmations === 1 ? "" : "s"}.
          </p>
          <Link
            to="/station/$id"
            params={{ id: top.station.id }}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            View station
          </Link>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Based on community reports · အသိုင်းအဝိုင်း အစီရင်ခံစာများပေါ်တွင် အခြေခံသည်။
          </p>

          {ranked.length > 1 ? (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Also consider
              </p>
              <ul className="space-y-2">
                {ranked.slice(1).map((r) => (
                  <li key={r.station.id}>
                    <Link
                      to="/station/$id"
                      params={{ id: r.station.id }}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate pr-2">
                        {r.station.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.state.queue ?? "No queue"} · {r.distanceKm.toFixed(1)} km
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : fuel ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No open stations reporting {fuel} right now. Try another fuel type.
        </div>
      ) : null}
    </AppShell>
  );
}
