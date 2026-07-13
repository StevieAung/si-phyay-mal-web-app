import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, MapPin, Navigation, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/fuel/AppShell";
import { StatusBadge } from "@/components/fuel/StatusBadge";
import { QueueBadge } from "@/components/fuel/QueueBadge";
import { useFuelStore } from "@/lib/fuel/store";
import {
  deriveStationStates,
  distanceKm,
  formatRelativeTime,
  isOutdated,
} from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";
import type { Confidence } from "@/lib/fuel/types";

export const Route = createFileRoute("/station/$id")({
  component: StationDetail,
  notFoundComponent: NotFoundBody,
});

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  High: "bg-available/15 text-available",
  Medium: "bg-limited/25 text-limited-foreground",
  Low: "bg-closed/15 text-closed",
  Conflicting: "bg-soldout/15 text-soldout",
};

function StationDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { stations, reports } = useFuelStore();
  const station = stations.find((s) => s.id === id);
  if (!station) throw notFound();

  const states = useMemo(
    () => deriveStationStates(station, reports),
    [station, reports],
  );
  const dist = distanceKm(MANDALAY_CENTER, { lat: station.lat, lng: station.lng });
  const latestReports = useMemo(
    () =>
      [...reports]
        .filter((r) => r.stationId === station.id)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    [reports, station.id],
  );

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`;

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => router.history.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">
            {station.name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {station.nameEn}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-start gap-1.5 text-sm text-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            {station.address}, {station.township}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {dist.toFixed(1)} km from central Mandalay
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Navigation className="h-4 w-4" aria-hidden />
            လမ်းညွှန် · Directions
          </a>
          <Link
            to="/report"
            search={{ stationId: station.id }}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-primary bg-card px-4 text-sm font-medium text-primary"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            အစီရင်ခံ · Report
          </Link>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          ဆီအမျိုးအစား · Fuel availability
        </h2>
        <div className="space-y-2">
          {station.offeredFuels.map((f) => {
            const s = states.find((x) => x.fuelType === f);
            return (
              <div
                key={f}
                className="rounded-2xl border border-border bg-card p-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {f}
                  </span>
                  {s ? (
                    <StatusBadge status={s.status} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No data</span>
                  )}
                </div>
                {s ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {s.queue ? <QueueBadge queue={s.queue} /> : null}
                    <span>
                      {formatRelativeTime(s.updatedAt)}
                      {isOutdated(s.updatedAt) ? " · outdated" : ""}
                    </span>
                    <span>· {s.confirmations} confirmations</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CONFIDENCE_STYLE[s.confidence]}`}
                    >
                      {s.confidence} confidence
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          နောက်ဆုံး အစီရင်ခံစာများ · Latest reports
        </h2>
        <ul className="space-y-2">
          {latestReports.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-card p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
                  {r.fuelType}
                </span>
                <StatusBadge status={r.status} size="sm" />
                {r.queue ? <QueueBadge queue={r.queue} /> : null}
                <span className="text-muted-foreground">
                  {formatRelativeTime(r.timestamp)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Based on community reports · အသိုင်းအဝိုင်း အစီရင်ခံစာများပေါ်တွင် အခြေခံသည်။
        </p>
      </section>
    </AppShell>
  );
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
