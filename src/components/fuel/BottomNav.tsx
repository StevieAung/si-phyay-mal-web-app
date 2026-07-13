import { Link, useNavigate } from "@tanstack/react-router";
import { Map, MessageCircle, Plus } from "lucide-react";
import { useSession } from "@/lib/fuel/session";

const SIDE_ITEMS: {
  to: "/" | "/ask";
  label: string;
  my: string;
  Icon: typeof Map;
  exact?: boolean;
}[] = [
  { to: "/", label: "Discover", my: "ရှာဖွေ", Icon: Map, exact: true },
  { to: "/ask", label: "Ask", my: "မေးမြန်း", Icon: MessageCircle },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { requireCompleteProfile } = useSession();

  function onReportClick(e: React.MouseEvent) {
    e.preventDefault();
    requireCompleteProfile({
      kind: "report",
      onResume: () => navigate({ to: "/report" }),
    });
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-[0_-2px_10px_-6px_rgba(24,32,43,0.12)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <ul className="mx-auto grid h-[72px] max-w-lg grid-cols-3 items-center">
        <li>
          <NavItem {...SIDE_ITEMS[0]} />
        </li>
        <li className="relative flex h-full flex-col items-center justify-end pb-2">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 -top-6 h-16 w-16 -translate-x-1/2 rounded-full bg-[#DC2626]/20 blur-md"
          />
          <button
            type="button"
            onClick={onReportClick}
            aria-label="Report / အစီရင်ခံ"
            className="group absolute left-1/2 -top-5 grid h-[60px] w-[60px] -translate-x-1/2 place-items-center rounded-full bg-[#DC2626] text-white shadow-lg shadow-[#DC2626]/40 outline-none ring-0 transition-transform duration-150 hover:scale-105 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.97]"
          >
            <Plus className="h-7 w-7" aria-hidden strokeWidth={2.5} />
          </button>
          <span className="text-[11px] font-semibold text-[#DC2626]">
            အစီရင်ခံ
          </span>
        </li>
        <li>
          <NavItem {...SIDE_ITEMS[1]} />
        </li>
      </ul>
    </nav>
  );
}

function NavItem({
  to,
  label,
  my,
  Icon,
  exact,
}: {
  to: "/" | "/ask";
  label: string;
  my: string;
  Icon: typeof Map;
  exact?: boolean;
}) {
  return (
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
  );
}
