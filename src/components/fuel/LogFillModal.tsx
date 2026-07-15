import { useMemo, useState } from "react";
import { X, Fuel } from "lucide-react";
import type { Station, FuelType } from "@/lib/fuel/types";
import type { FillEntry } from "@/lib/fuel/fillHistory";
import { StationPicker } from "@/components/fuel/StationPicker";
import { useGeolocation } from "@/hooks/useGeolocation";

export function LogFillModal({
  stations,
  defaultFuel,
  defaultPrice,
  onClose,
  onSubmit,
}: {
  stations: Station[];
  defaultFuel: FuelType;
  defaultPrice?: number;
  onClose: () => void;
  onSubmit: (e: Omit<FillEntry, "id" | "ts">) => void;
}) {
  const [stationId, setStationId] = useState<string>(stations[0]?.id ?? "");
  const [fuelType, setFuelType] = useState<FuelType>(defaultFuel);
  const [liters, setLiters] = useState<string>("10");
  const [pricePerL, setPricePerL] = useState<string>(String(defaultPrice ?? 3150));
  const geo = useGeolocation();

  const station = useMemo(
    () => stations.find((s) => s.id === stationId) ?? null,
    [stations, stationId],
  );

  const total = (Number(liters) || 0) * (Number(pricePerL) || 0);
  const canSubmit = station && Number(liters) > 0 && Number(pricePerL) > 0;

  function submit() {
    if (!canSubmit || !station) return;
    onSubmit({
      stationId: station.id,
      stationName: station.name,
      fuelType,
      liters: Number(liters),
      pricePerL: Number(pricePerL),
      total,
    });
  }

  const offered = station?.offeredFuels ?? (["92", "95", "Diesel"] as FuelType[]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Fuel className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-sm font-bold text-foreground">ဆီဖြည့်မှတ်တမ်း တင်ရန်</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <span className="mb-1 block text-[12px] text-muted-foreground">
              ဘယ်ဆီဆိုင်မှာ ဖြည့်ခဲ့လဲ
            </span>
            <StationPicker
              stations={stations}
              value={stationId}
              onChange={setStationId}
              origin={geo.coords}
            />
          </div>


          <div>
            <span className="mb-1 block text-[12px] text-muted-foreground">ဆီအမျိုးအစား</span>
            <div className="flex flex-wrap gap-1.5">
              {offered.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFuelType(f)}
                  className={`h-9 rounded-full border px-3 text-[12px] font-medium ${
                    fuelType === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted-foreground">ဖြည့်လီတာ</span>
              <input
                inputMode="decimal"
                value={liters}
                onChange={(e) => setLiters(e.target.value.replace(/[^\d.]/g, ""))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted-foreground">၁ လီတာဈေး (ကျပ်)</span>
              <input
                inputMode="numeric"
                value={pricePerL}
                onChange={(e) => setPricePerL(e.target.value.replace(/[^\d]/g, ""))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5">
            <span className="text-[12px] text-foreground">စုစုပေါင်း</span>
            <span className="text-base font-bold text-primary">
              {total.toLocaleString("en-US")} ကျပ်
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onClose}
              className="h-11 rounded-full border border-border bg-background text-sm font-medium text-foreground"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              မှတ်တမ်းတင်ရန်
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
