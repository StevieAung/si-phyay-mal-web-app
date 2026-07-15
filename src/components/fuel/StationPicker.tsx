import { useMemo, useState } from "react";
import { Search, X, MapPin, ChevronRight } from "lucide-react";
import type { Station } from "@/lib/fuel/types";
import { distanceKm } from "@/lib/fuel/derive";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";

interface StationPickerProps {
  stations: Station[];
  value: string;
  onChange: (id: string) => void;
  origin?: { lat: number; lng: number } | null;
  placeholder?: string;
}

/**
 * Station selector UX:
 * - Trigger button showing current selection.
 * - Opens a modal showing nearest 4 stations by distance.
 * - Search input filters across all stations.
 * - "View all stations" reveals the full list.
 */
export function StationPicker({
  stations,
  value,
  onChange,
  origin,
  placeholder = "ဆီဆိုင်ရွေးရန်",
}: StationPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const selected = stations.find((s) => s.id === value) ?? null;
  const from = origin ?? MANDALAY_CENTER;

  const ranked = useMemo(() => {
    return stations
      .map((s) => ({
        station: s,
        distance: distanceKm(from, { lat: s.lat, lng: s.lng }),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [stations, from]);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return ranked;
    return ranked.filter(
      (r) =>
        r.station.name.toLowerCase().includes(query) ||
        r.station.nameEn.toLowerCase().includes(query) ||
        r.station.township.toLowerCase().includes(query) ||
        r.station.address.toLowerCase().includes(query),
    );
  }, [ranked, query]);

  const list = query || showAll ? filtered : filtered.slice(0, 4);

  function close() {
    setOpen(false);
    setQ("");
    setShowAll(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                · {selected.township}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select station"
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-bold text-foreground">
                ဆီဆိုင်ရွေးရန် · Choose station
              </h3>
              <button
                onClick={close}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="border-b border-border p-3">
              <label className="relative block">
                <span className="sr-only">Search stations</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ရှာဖွေရန် / Search all stations…"
                  className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              {!query && (
                <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                  အနီးဆုံး ဆီဆိုင် ၄ ခု · Nearest 4 stations
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                  No stations match / တွေ့ရှိမှုမရှိပါ
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((r) => {
                    const active = r.station.id === value;
                    return (
                      <li key={r.station.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(r.station.id);
                            close();
                          }}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                            active
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          <span
                            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                            aria-hidden
                          >
                            <MapPin className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                                {r.station.name}
                              </p>
                              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                                {r.distance.toFixed(1)} km
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                              {r.station.address}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                              {r.station.township}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!query && !showAll && filtered.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-3 h-11 w-full rounded-full border border-border bg-background text-sm font-medium text-foreground hover:border-primary/40"
                >
                  ဆီဆိုင် အားလုံးကြည့်ရန် · View all stations ({filtered.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
