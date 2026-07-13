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
  Closed: "#3f4652",
  Unknown: "#8a8a8a",
};

export function StationMap({
  pins,
  center,
  selectedId,
  heightClass = "h-full",
}: {
  pins: Pin[];
  center: { lat: number; lng: number };
  selectedId?: string;
  heightClass?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapEl = useMemo(() => {
    if (!mounted) return null;
    return (
      <LeafletMap
        pins={pins}
        center={center}
        selectedId={selectedId}
        onSelect={(id) => navigate({ to: "/station/$id", params: { id } })}
        onFail={() => setFailed(true)}
      />
    );
  }, [mounted, pins, center, selectedId, navigate]);

  return (
    <div className={`relative w-full overflow-hidden bg-secondary ${heightClass}`}>
      {!mounted || failed ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {failed
            ? "Map unavailable — use the station list below / မြေပုံ မဖွင့်နိုင်၊ အောက်စာရင်း သုံးပါ"
            : "Loading map… / မြေပုံ တင်နေသည်…"}
        </div>
      ) : (
        mapEl
      )}
    </div>
  );
}

function pumpSvg(color: string, selected: boolean) {
  const size = selected ? 40 : 34;
  const ring = selected ? '<circle cx="20" cy="20" r="19" fill="none" stroke="' + color + '" stroke-opacity="0.35" stroke-width="2"/>' : "";
  return `
<div style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-100%);">
<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  ${ring}
  <circle cx="20" cy="20" r="13" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
  <g fill="#ffffff">
    <rect x="14.5" y="12" width="7" height="14" rx="1.2"/>
    <rect x="15.75" y="14" width="4.5" height="3" fill="${color}"/>
    <path d="M22 15.5 h1.2 c0.4 0 0.7 0.3 0.7 0.7 v6.5 c0 0.6 0.5 1.1 1.1 1.1 s1.1-0.5 1.1-1.1 v-4.2 l-1.1-1.1" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" fill="none"/>
  </g>
</svg>
<div style="position:absolute;left:50%;bottom:-3px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};transform:translateX(-50%);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.15));"></div>
</div>`;
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
    Marker: React.ComponentType<Record<string, unknown>>;
    Tooltip: React.ComponentType<Record<string, unknown>>;
    L: typeof import("leaflet");
  }>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("react-leaflet"), import("leaflet")])
      .then(([mod, L]) => {
        if (cancelled) return;
        setComp({
          MapContainer: mod.MapContainer as unknown as React.ComponentType<Record<string, unknown>>,
          TileLayer: mod.TileLayer as unknown as React.ComponentType<Record<string, unknown>>,
          Marker: mod.Marker as unknown as React.ComponentType<Record<string, unknown>>,
          Tooltip: mod.Tooltip as unknown as React.ComponentType<Record<string, unknown>>,
          L: L.default ?? L,
        });
      })
      .catch(() => onFail());
    return () => {
      cancelled = true;
    };
  }, [onFail]);

  if (!Comp) return null;
  const { MapContainer, TileLayer, Marker, Tooltip, L } = Comp;

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
        const icon = L.divIcon({
          className: "pump-pin",
          html: pumpSvg(color, isSel),
          iconSize: [isSel ? 40 : 34, isSel ? 40 : 34],
          iconAnchor: [0, 0],
        });
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(station.id) }}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={1}>
              <span className="text-xs font-medium">{station.name}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
