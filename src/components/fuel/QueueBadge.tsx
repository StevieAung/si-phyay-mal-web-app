import type { QueueLength } from "@/lib/fuel/types";
import { Users } from "lucide-react";

const MAP: Record<QueueLength, { my: string; en: string; dots: number }> = {
  "No Queue": { my: "တန်းစီမရှိ", en: "No Queue", dots: 0 },
  Short: { my: "အနည်းငယ်", en: "Short", dots: 1 },
  Medium: { my: "အလယ်အလတ်", en: "Medium", dots: 2 },
  Long: { my: "ရှည်လျား", en: "Long", dots: 3 },
};

export function QueueBadge({ queue }: { queue: QueueLength }) {
  const { my, en, dots } = MAP[queue];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
      aria-label={`Queue: ${en}`}
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span aria-hidden className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < dots ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </span>
      <span>{my}</span>
      <span className="text-muted-foreground">· {en}</span>
    </span>
  );
}
