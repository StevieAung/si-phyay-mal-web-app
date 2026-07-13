import { Link } from "@tanstack/react-router";
import { Map, MessageCircle, PlusCircle } from "lucide-react";

const ITEMS: {
  to: "/" | "/ask" | "/report";
  label: string;
  my: string;
  Icon: typeof Map;
  exact?: boolean;
}[] = [
  { to: "/", label: "Discover", my: "ရှာဖွေ", Icon: Map, exact: true },
  { to: "/ask", label: "Ask", my: "မေးမြန်း", Icon: MessageCircle },
  { to: "/report", label: "Report", my: "အစီရင်ခံ", Icon: PlusCircle },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {ITEMS.map(({ to, label, my, Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: !!exact }}
              className="group flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
            >
              <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-primary/10">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="leading-tight">{my}</span>
              <span className="text-[9px] opacity-70 leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
