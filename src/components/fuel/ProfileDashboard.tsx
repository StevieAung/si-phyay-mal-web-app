import { useMemo, useRef, useState } from "react";
import { X, Upload, Eye, RefreshCw, QrCode, Fuel, Calculator, History, Bike, Car } from "lucide-react";
import type { Profile } from "@/lib/fuel/session";
import { computeAllowance } from "@/lib/fuel/allowance";



export function ProfileDashboard({ profile }: { profile: Profile }) {
  // ---------- QR upload ----------
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUploadedAt, setQrUploadedAt] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|jpg|png|webp)/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      setQrDataUrl(String(reader.result));
      setQrUploadedAt(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ---------- Allowance from Engine CC ----------
  const isMoto = profile.vehicle === "မော်တော်ဆိုင်ကယ်";
  const allowance = useMemo(
    () => computeAllowance(profile.vehicle, profile.engineCc),
    [profile.vehicle, profile.engineCc],
  );

  // ---------- Mock weekly usage ----------
  const usedFills = 1;
  const usedLiters = 10;
  const remainingLiters = Math.max(0, allowance.liters - usedLiters);

  // ---------- Fuel calculator ----------
  const [pricePerL, setPricePerL] = useState<string>("3150");
  const [liters, setLiters] = useState<string>(String(allowance.liters));
  const total = useMemo(() => {
    const p = Number(pricePerL) || 0;
    const l = Number(liters) || 0;
    return p * l;
  }, [pricePerL, liters]);

  return (
    <div className="mt-4 space-y-3">
      {/* ---------- QR Code Card ---------- */}
      <section className="rounded-2xl border border-border bg-background/60 p-3">
        <header className="mb-2">
          <h3 className="text-sm font-bold text-foreground">ကျွန်ုပ်၏ ယာဉ် QR Code</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            ဆီဖြည့်ရာတွင် အတည်ပြုရန် QR Code ဓာတ်ပုံတင်ထားပါ
          </p>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />

        {!qrDataUrl ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-4">
            <div className="grid h-20 w-20 place-items-center rounded-xl bg-secondary/60 text-muted-foreground">
              <QrCode className="h-10 w-10" aria-hidden />
            </div>
            <p className="text-[12px] text-muted-foreground">QR Code မတင်ရသေးပါ</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              ဓာတ်ပုံတင်ရန်
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
            <img
              src={qrDataUrl}
              alt="Vehicle QR"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <p className="text-[12px] font-medium text-available">QR Code တင်ပြီးပါပြီ</p>
            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-background text-xs font-medium text-foreground"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                ကြည့်ရန်
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                ပြန်တင်ရန်
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Allowance from Engine CC ---------- */}
      <section className="rounded-2xl border border-border bg-background/60 p-3">
        <header className="mb-2 flex items-center gap-1.5">
          {isMoto ? (
            <Bike className="h-4 w-4 text-primary" aria-hidden />
          ) : (
            <Car className="h-4 w-4 text-primary" aria-hidden />
          )}
          <h3 className="text-sm font-bold text-foreground">ယာဉ်ခွင့်ပြုပမာဏ</h3>
        </header>
        <dl className="grid grid-cols-3 gap-2 text-[12px]">
          <QuotaCell label="Engine" value={`${profile.engineCc} CC`} />
          <QuotaCell label="Weekly Limit" value={`${allowance.liters} L`} />
          <QuotaCell label="Fill Limit" value={`${allowance.fills} ကြိမ် / ပတ်`} />
        </dl>
      </section>

      {/* ---------- Weekly usage ---------- */}
      <section className="rounded-2xl border border-border bg-background/60 p-3">
        <header className="mb-2 flex items-center gap-1.5">
          <Fuel className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-bold text-foreground">ဒီအပတ် ဆီဖြည့်မှု</h3>
        </header>
        <dl className="grid grid-cols-3 gap-2 text-[12px]">
          <QuotaCell label="ဆီဖြည့်" value={`${usedFills} / ${allowance.fills} ကြိမ်`} />
          <QuotaCell label="ဖြည့်ပြီး" value={`${usedLiters} L`} />
          <QuotaCell label="ကျန်ရှိ" value={`${remainingLiters} L`} />
        </dl>
      </section>

      {/* ---------- Calculator ---------- */}
      <section className="rounded-2xl border border-border bg-background/60 p-3">
        <header className="mb-2 flex items-center gap-1.5">
          <Calculator className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-bold text-foreground">ဆီဖြည့်တွက်ချက်ရန်</h3>
        </header>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">၁ လီတာဈေး (ကျပ်)</span>
            <input
              inputMode="numeric"
              value={pricePerL}
              onChange={(e) => setPricePerL(e.target.value.replace(/[^\d]/g, ""))}
              className="h-10 w-full rounded-xl border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted-foreground">ဖြည့်မည့်လီတာ</span>
            <input
              inputMode="decimal"
              value={liters}
              onChange={(e) => setLiters(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-10 w-full rounded-xl border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2">
          <span className="text-[12px] text-foreground">စုစုပေါင်း</span>
          <span className="text-sm font-bold text-primary">
            {total.toLocaleString("en-US")} ကျပ်
          </span>
        </div>
      </section>

      {/* ---------- History ---------- */}
      <section className="rounded-2xl border border-border bg-background/60 p-3">
        <header className="mb-2 flex items-center gap-1.5">
          <History className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-bold text-foreground">ဆီဖြည့်မှတ်တမ်း</h3>
        </header>
        <ul className="space-y-2">
          <HistoryItem date="14 July 2026" station="Mandalay Fuel Station" fuel={profile.fuelType} liters="10 L" cost="31,500 MMK" />
          <HistoryItem date="07 July 2026" station="Chan Mya Fuel" fuel={profile.fuelType} liters="10 L" cost="31,500 MMK" />
          <HistoryItem date="30 June 2026" station="Aung Pyi Fuel Depot" fuel={profile.fuelType} liters="20 L" cost="65,000 MMK" />
        </ul>
      </section>

      {/* ---------- Preview modal ---------- */}
      {previewOpen && qrDataUrl && (
        <QrPreviewModal
          imgSrc={qrDataUrl}
          onClose={() => setPreviewOpen(false)}
          profile={profile}
          uploadedAt={qrUploadedAt ?? ""}
        />
      )}
    </div>
  );
}

function QuotaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2 text-center">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

function HistoryItem({
  date,
  station,
  fuel,
  liters,
  cost,
}: {
  date: string;
  station: string;
  fuel: string;
  liters: string;
  cost: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{date}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
          {fuel}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{station}</p>
      <div className="mt-1 flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{liters}</span>
        <span className="font-semibold text-primary">{cost}</span>
      </div>
    </li>
  );
}

function QrPreviewModal({
  imgSrc,
  onClose,
  profile,
  uploadedAt,
}: {
  imgSrc: string;
  onClose: () => void;
  profile: Profile;
  uploadedAt: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-foreground">ယာဉ် QR Code</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 p-4">
          <img
            src={imgSrc}
            alt="Vehicle QR"
            className="h-56 w-56 rounded-xl border border-border object-contain bg-background"
          />
          <dl className="w-full space-y-1.5 text-[12px]">
            <PreviewRow label="ယာဉ်နံပါတ်" value={profile.plate} />
            <PreviewRow label="အမျိုးအစား" value={profile.vehicle} />
            <PreviewRow label="ပိုင်ရှင်အမည်" value={profile.name} />
            <PreviewRow label="ဆီအမျိုးအစား" value={profile.fuelType} />
            <PreviewRow label="Engine" value={`${profile.engineCc} CC`} />
            {uploadedAt && <PreviewRow label="တင်သည့်ရက်" value={uploadedAt} />}
            <PreviewRow
              label="QR Status"
              value={<span className="font-semibold text-available">🟢 Verified</span>}
            />
          </dl>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
