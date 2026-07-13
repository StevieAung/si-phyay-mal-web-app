import { Link } from "@tanstack/react-router";
import { MapPin, Clock } from "lucide-react";
import type { FuelState, Station } from "@/lib/fuel/types";
import { StatusBadge } from "./StatusBadge";
import { QueueBadge } from "./QueueBadge";
import { formatRelativeTime, isOutdated } from "@/lib/fuel/derive";

export function StationCard({
  station,
  state,
  distanceKm,
}: {
  station: Station;
  state: FuelState | null;
  distanceKm: number;
}) {
  return (
    <Link
      to="/station/$id"
      params={{ id: station.id }}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-foreground">
            {station.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{station.township}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-sm font-semibold text-primary">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
      </div>

      {state ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {state.fuelType}
          </span>
          <StatusBadge status={state.status} size="sm" />
          {state.queue ? <QueueBadge queue={state.queue} /> : null}
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              isOutdated(state.updatedAt)
                ? "text-limited-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Clock className="h-3 w-3" aria-hidden />
            {formatRelativeTime(state.updatedAt)}
          </span>
          {isOutdated(state.updatedAt) ? (
            <span className="rounded-md bg-limited/20 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              Outdated / ရက်စွဲဟောင်း
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No community reports yet / အစီရင်ခံစာ မရှိသေးပါ
        </p>
      )}
    </Link>
  );
}
