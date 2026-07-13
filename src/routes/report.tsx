import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { AppShell, BrandHeader } from "@/components/fuel/AppShell";
import { useFuelStore } from "@/lib/fuel/store";
import {
  FUEL_STATUSES,
  FUEL_TYPES,
  QUEUE_LENGTHS,
  type FuelStatus,
  type FuelType,
  type QueueLength,
} from "@/lib/fuel/types";

const searchSchema = z.object({
  stationId: z.string().optional(),
});

export const Route = createFileRoute("/report")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ReportPage,
});

function ReportPage() {
  const { stationId: preselected } = Route.useSearch();
  const { stations, addReport } = useFuelStore();
  const navigate = useNavigate();

  const [stationId, setStationId] = useState<string>(
    preselected ?? stations[0]?.id ?? "",
  );
  const [fuelType, setFuelType] = useState<FuelType>("Diesel");
  const [status, setStatus] = useState<FuelStatus>("Available");
  const [queue, setQueue] = useState<QueueLength>("Short");
  const [submitted, setSubmitted] = useState<null | { stationId: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const requiresQueue = status === "Available" || status === "Limited";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const station = stations.find((s) => s.id === stationId);
    if (!station) return setError("Please select a station.");
    if (!station.offeredFuels.includes(fuelType))
      return setError("This station doesn't offer that fuel type.");
    addReport({
      stationId,
      fuelType,
      status,
      queue: requiresQueue ? queue : null,
    });
    setSubmitted({ stationId });
  }

  if (submitted) {
    return (
      <AppShell>
        <BrandHeader />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-available/15 text-available">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            ကျေးဇူးတင်ပါတယ်! · Thanks for reporting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your update helps other drivers.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                navigate({
                  to: "/station/$id",
                  params: { id: submitted.stationId },
                })
              }
              className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground"
            >
              View station
            </button>
            <button
              onClick={() => {
                setSubmitted(null);
              }}
              className="h-11 rounded-full border border-border bg-card text-sm font-medium text-foreground"
            >
              Report another
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const selectedStation = stations.find((s) => s.id === stationId);
  const availableFuels = selectedStation?.offeredFuels ?? FUEL_TYPES;

  return (
    <AppShell>
      <BrandHeader subtitle="အစီရင်ခံရန် · Submit a community report" />

      <form onSubmit={submit} className="space-y-4">
        <Field label="ဆီဆိုင် · Station">
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.township}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ဆီအမျိုးအစား · Fuel type">
          <ChipGroup
            options={availableFuels}
            value={fuelType}
            onChange={(v) => setFuelType(v)}
          />
        </Field>

        <Field label="အခြေအနေ · Status">
          <ChipGroup
            options={FUEL_STATUSES}
            value={status}
            onChange={(v) => setStatus(v)}
          />
        </Field>

        {requiresQueue ? (
          <Field label="တန်းစီ · Queue length">
            <ChipGroup
              options={QUEUE_LENGTHS}
              value={queue}
              onChange={(v) => setQueue(v)}
            />
          </Field>
        ) : (
          <p className="text-xs text-muted-foreground">
            No queue needed for {status.toLowerCase()} stations.
          </p>
        )}

        {error ? (
          <p className="rounded-xl bg-soldout/10 px-3 py-2 text-sm text-soldout">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          တင်ပြရန် · Submit report
        </button>
        <p className="text-[11px] text-muted-foreground">
          Community information is not official station information.
        </p>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={`h-10 rounded-full border px-3 text-sm font-medium ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
