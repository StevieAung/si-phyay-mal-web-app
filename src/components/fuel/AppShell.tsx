import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="mb-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-primary">ဆီဖြည့်မယ်</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            ဆီရှိတဲ့နေရာ သိပြီး၊ ဆီဖြည့်မယ်။
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
          📍 မန္တလေး · Mandalay
        </span>
      </div>
      {subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
