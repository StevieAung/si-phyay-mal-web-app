import { FUEL_TYPES, type FuelType } from "@/lib/fuel/types";

export function FuelFilter({
  value,
  onChange,
}: {
  value: FuelType | "All";
  onChange: (v: FuelType | "All") => void;
}) {
  const options: (FuelType | "All")[] = ["All", ...FUEL_TYPES];
  return (
    <div
      role="tablist"
      aria-label="Fuel type filter"
      className="flex gap-1.5 overflow-x-auto pb-1"
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={`h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {opt === "All" ? "အားလုံး · All" : opt}
          </button>
        );
      })}
    </div>
  );
}
