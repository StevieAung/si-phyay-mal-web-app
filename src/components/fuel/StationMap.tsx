import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { FuelStatus, Station } from "@/lib/fuel/types";

interface Pin {
  station: Station;
  status: FuelStatus | null;
}

const STATUS_COLOR: Record<FuelStatus | "Unknown", string> = {
  Available: "#2f9c5c",
  Limited: "#d99a2b",
  "Sold Out": "#c53a3a",
  Closed: "#4a4a4a",
  Unknown: "#8a8a8a",
};

export function StationMap({
  pins,
  center,
  selectedId,
}: {
  pins: Pin[];
  center: { lat: number; lng: number };
  selectedId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapEl = useMemo(() => {
    if (!mounted) return null;
    return <LeafletMap pins={pins} center={center} selectedId={selectedId} onSelect={(id) => navigate({ to: "/station/$id", params: { id } })} onFail={() => setFailed(true)} />;
  }, [mounted, pins, center, selectedId, navigate]);

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-border bg-secondary">
      {!mounted || failed ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {failed
            ? "Map unavailable — use the station list below / မြေပုံ မဖွင့်နိုင်၊ အောက်စာရင်း သုံးပါ"
            : "Loading map… / မြေပုံ တင်နေသည်…"}
        </div>
      ) : (
        mapEl
      )}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg bg-card/95 px-2 py-1.5 text-[10px] shadow">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {(["Available", "Limited", "Sold Out", "Closed"] as FuelStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: STATUS_COLOR[s] }}
              aria-hidden
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function LeafletMap({
  pins,
  center,
  selectedId,
  onSelect,
  onFail,
}: {
  pins: Pin[];
  center: { lat: number; lng: number };
  selectedId?: string;
  onSelect: (id: string) => void;
  onFail: () => void;
}) {
  const [Comp, setComp] = useState<null | {
    MapContainer: React.ComponentType<Record<string, unknown>>;
    TileLayer: React.ComponentType<Record<string, unknown>>;
    CircleMarker: React.ComponentType<Record<string, unknown>>;
    Tooltip: React.ComponentType<Record<string, unknown>>;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    import("react-leaflet")
      .then((mod) => {
        if (cancelled) return;
        setComp({
          MapContainer: mod.MapContainer as unknown as React.ComponentType<Record<string, unknown>>,
          TileLayer: mod.TileLayer as unknown as React.ComponentType<Record<string, unknown>>,
          CircleMarker: mod.CircleMarker as unknown as React.ComponentType<Record<string, unknown>>,
          Tooltip: mod.Tooltip as unknown as React.ComponentType<Record<string, unknown>>,
        });
      })
      .catch(() => onFail());
    return () => {
      cancelled = true;
    };
  }, [onFail]);

  if (!Comp) return null;
  const { MapContainer, TileLayer, CircleMarker, Tooltip } = Comp;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(({ station, status }) => {
        const color = STATUS_COLOR[status ?? "Unknown"];
        const isSel = station.id === selectedId;
        return (
          <CircleMarker
            key={station.id}
            center={[station.lat, station.lng]}
            radius={isSel ? 12 : 9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(station.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <span className="text-xs font-medium">{station.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
