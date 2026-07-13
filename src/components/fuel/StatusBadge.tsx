import type { FuelStatus } from "@/lib/fuel/types";
import { CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";

const MAP: Record<
  FuelStatus,
  { cls: string; label: string; my: string; Icon: typeof CheckCircle2 }
> = {
  Available: {
    cls: "bg-available text-available-foreground",
    label: "Available",
    my: "ရနိုင်",
    Icon: CheckCircle2,
  },
  Limited: {
    cls: "bg-limited text-limited-foreground",
    label: "Limited",
    my: "အနည်းငယ်",
    Icon: AlertTriangle,
  },
  "Sold Out": {
    cls: "bg-soldout text-soldout-foreground",
    label: "Sold Out",
    my: "ကုန်ပြီ",
    Icon: XCircle,
  },
  Closed: {
    cls: "bg-closed text-closed-foreground",
    label: "Closed",
    my: "ပိတ်",
    Icon: Ban,
  },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: FuelStatus;
  size?: "sm" | "md";
}) {
  const { cls, label, my, Icon } = MAP[status];
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cls} ${px}`}
      aria-label={`Status: ${label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{my}</span>
      <span className="opacity-80">· {label}</span>
    </span>
  );
}
