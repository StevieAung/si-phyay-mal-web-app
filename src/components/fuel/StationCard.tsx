import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Fuel } from "lucide-react";
import type { FuelState, Station } from "@/lib/fuel/types";
import { StatusBadge } from "./StatusBadge";
import { formatRelativeTime, isOutdated } from "@/lib/fuel/derive";

const STATUS_DOT: Record<string, string> = {
  Available: "bg-available",
  Limited: "bg-limited",
  "Sold Out": "bg-soldout",
  Closed: "bg-closed",
};

export function StationCard({
  station,
  state,
  distanceKm,
  selected,
}: {
  station: Station;
  state: FuelState | null;
  distanceKm: number;
  selected?: boolean;
}) {
  const iconTone = state ? STATUS_DOT[state.status] : "bg-muted";
  return (
    <Link
      to="/station/$id"
      params={{ id: station.id }}
      className={`block rounded-2xl border bg-card p-3.5 shadow-[0_1px_2px_rgba(24,32,43,0.04)] transition active:scale-[0.995] hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        selected ? "border-primary/60 ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconTone} text-white`}
          aria-hidden
        >
          <Fuel className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold text-foreground">
              {station.name}
            </h3>
            {state ? (
              <span className="shrink-0 sm:block hidden">
                <StatusBadge status={state.status} size="sm" />
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {distanceKm.toFixed(1)} km · {station.address}
            </span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {station.offeredFuels.slice(0, 4).map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {f}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 sm:hidden">
            {state ? <StatusBadge status={state.status} size="sm" /> : (
              <span className="text-[11px] text-muted-foreground">No reports yet</span>
            )}
            {state ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] ${
                  isOutdated(state.updatedAt)
                    ? "text-limited-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" aria-hidden />
                {formatRelativeTime(state.updatedAt)}
              </span>
            ) : null}
          </div>

          {state ? (
            <div className="mt-1.5 hidden items-center justify-end sm:flex">
              <span
                className={`inline-flex items-center gap-1 text-[11px] ${
                  isOutdated(state.updatedAt)
                    ? "text-limited-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" aria-hidden />
                {formatRelativeTime(state.updatedAt)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
