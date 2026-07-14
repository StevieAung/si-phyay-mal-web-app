# ဆီဖြည့်မယ် — Backend Integration Preparation Report

Read-only audit. No code, DB, or config changes are proposed for execution — this document is a preparation artifact only.

---

## 1. Current Application Overview

- **Stack**: React 19 + TypeScript (strict), TanStack Start / Router v1 (file-based routes), Vite 7, Tailwind v4, Leaflet + react-leaflet, lucide-react icons.
- **Routes** (`src/routes/`): `__root.tsx`, `index.tsx` (Discover), `station.$id.tsx` (detail), `report.tsx`, `ask.tsx`, `sitemap[.]xml.ts`.
- **Major components** (`src/components/fuel/`): `AppShell`, `BottomNav` (fixed, elevated Report FAB), `StationMap` (Leaflet + user pin + radius circle), `StationCard`, `StatusBadge`, `QueueBadge`, `FuelFilter`, `AccountSheet` (multi-step demo sign-in), `ProfileDashboard` (QR, parity, permission, allowance, calculator, history), `LogFillModal`.
- **State management**: Two React Context providers — `FuelProvider` (`src/lib/fuel/store.tsx`) for stations/reports/confirmations, `SessionProvider` (`src/lib/fuel/session.tsx`) for demo phone/profile/pending action guard. Local `useState` in routes/components. No TanStack Query, no server functions.
- **Data sources**: Hardcoded seed of 10 Mandalay stations in `src/lib/fuel/stations.ts`; deterministic ranking in `derive.ts`; distance via Haversine; allowance rules in `allowance.ts`; phone/plate normalization in `phone.ts`/`plate.ts`.
- **Persistence**: `localStorage` under versioned keys — `sfm:v1:reports`, `sfm:v1:confirmations`, plus fill-history in `fillHistory.ts`. Session/profile and geolocation are React memory only (per project rules).

Supabase is connected at the project level (env + client scaffolding exist) but the app does not read/write it anywhere.

---

## 2. Frontend Feature Inventory

| Feature | Current impl | Files | Data source | Backend need | Complexity |
|---|---|---|---|---|---|
| Discover map | Leaflet + OSM tiles, custom SVG pump markers | `StationMap.tsx`, `routes/index.tsx` | seed stations | none for tiles; stations from DB | Low |
| Search | Client-side name/address filter | `routes/index.tsx` | seed | Optional server search later | Low |
| Fuel-type filter | Chips filter list + map | `FuelFilter.tsx` | seed | none | Low |
| Current location | Browser geolocation + explainer overlay | `hooks/useGeolocation.ts`, `routes/index.tsx` | browser API | none (stays client) | None |
| Radius filter (2/5/10/All) | Haversine + circle overlay | `derive.ts`, `StationMap.tsx` | derived | none | None |
| Station cards | Distance, status, queue, freshness, confidence | `StationCard.tsx` | store | reads from DB | Low |
| Station detail | Per-fuel status, latest 3 reports, still-accurate | `routes/station.$id.tsx` | store + localStorage | reports table | Med |
| Report flow | Guarded modal → save report | `routes/report.tsx`, `store.tsx` | localStorage | reports insert | Med |
| Confirmation ("အခုထိမှန်နေ") | Per-device cooldown, increments confirmation | `store.tsx` | localStorage | confirmations insert | Med |
| Confidence / conflicting | Recency + agreement scoring | `derive.ts` | derived | server-side derive or view | Med |
| Ask recommendation | Deterministic rank: exclude closed/sold-out, prefer short queue/fresh/close/confirmed | `routes/ask.tsx`, `derive.ts` | derived | stays deterministic, uses DB rows | Low |
| Directions | Google Maps deep link after guard | `station.$id.tsx` | url | none | None |
| Demo sign-in | 3-step sheet: phone → profile → view | `AccountSheet.tsx`, `session.tsx` | React memory | Supabase phone OTP | High |
| License plate စုံ/မ | Myanmar-digit normalize, 2 digits before first letter, parity from today's date | `plate.ts`, `ProfileDashboard.tsx` | pure | none (client rule) | None |
| Vehicle QR upload | FileReader → data URL + preview modal | `ProfileDashboard.tsx` | React memory | Supabase Storage | Med |
| Fuel permission card | Derived from parity vs `Date.now()` day parity | `ProfileDashboard.tsx` | derived | none (or server policy table later) | None |
| Weekly allowance | CC-based table (moto 8L×2; car ≤2000:35, ≤3000:40, >3000:45) | `allowance.ts` | pure | optional policy table | Low |
| Cost calculator | price × liters | `ProfileDashboard.tsx` | local state | none | None |
| Fill history | "ဒီနေ့ ဆီထည့်ပြီးပြီလား" CTA + modal + list | `LogFillModal.tsx`, `fillHistory.ts`, `routes/index.tsx` | localStorage | fills table (per-user) | Med |
| Bottom navigation | Fixed, safe-area, center Report FAB | `BottomNav.tsx` | static | none | None |
| Access guard | Pending-intent resume once | `session.tsx` | React memory | maps onto Supabase auth | Med |

---

## 3. Current User Flows

**A. Guest** — open `/` → geolocation explainer → grant or skip → map + radius circle + filtered nearby cards → tap card → `/station/$id` → view fuel/queue/freshness → tap Ask → `/ask` recommends with evidence. Works entirely offline of any backend. Limitation: stations are seed-only; no shared updates. Backend change: switch reads to Supabase.

**B. Contributor** — from card or detail → Report FAB → guard triggers `AccountSheet` if not signed-in/profile-complete → complete phone + vehicle → resume Report once → submit → written to `localStorage`. Limitation: local-only; no dedup; not visible to others. Backend change: insert into `reports` under `auth.uid()`.

**C. Confirmation** — station detail lists latest 3 reports → "အခုထိမှန်နေ" button (guarded, per-device cooldown) → increments confirmations. Limitation: cooldown is per-browser; anyone can spam across devices. Backend change: `confirmations` table with unique(user_id, report_id) + server timestamp.

**D. Location** — explainer overlay (z-1100, above Leaflet controls) → `navigator.geolocation` → user pin + translucent radius circle → radius chips 2/5/10/All (default 2 km) → cards sorted by distance → "Show all" fallback. Coordinates never leave React memory. Backend change: none — must remain client-only.

**E. Fill logging** — CTA below nearby list → guard → `LogFillModal` (station, fuel, liters, price, computed total) → saved to `localStorage` → last 5 shown below CTA. Backend change: `fills` table scoped to user.

---

## 4. Current Data Model

Current TypeScript shapes (paraphrased from `types.ts`, `session.tsx`, `fillHistory.ts`):

- **Station**: `id, name, address, lat, lng, fuels: Record<FuelType, { status, queue, updatedAt, ... }>`.
- **FuelType**: `92 | 95 | Diesel | Premium Diesel`. **Status**: `Available | Limited | Sold Out | Closed`. **Queue**: `No Queue | Short | Medium | Long`.
- **Report** (localStorage): `id, stationId, fuel, status, queue, note?, createdAt, reporterHash?`.
- **Confirmation**: `id, reportId, deviceKey, createdAt`.
- **Profile** (memory): `name, phone (masked), vehicle (ကား|မော်တော်ဆိုင်ကယ်), plate, fuelType, engineCc, parity`.
- **Fill entry**: `id, stationId, fuel, liters, pricePerL, total, createdAt`.
- **Derived (not stored)**: distance, freshness bucket, confidence (High/Med/Low/Conflicting), Ask ranking score.

Recommended split:
- **Move to DB**: stations, per-fuel current status, reports, confirmations, profiles, fills. QR image → Storage.
- **Stay client**: geolocation coordinates, radius selection, filter chips, search term, calculator inputs, pending-action intent, derived confidence/ranking (compute from DB rows in a view or client), plate parity.

---

## 5. Backend Migration Plan (recommendation only)

```
seed stations (stations.ts)          → public.stations
per-fuel status embedded in Station  → public.station_fuels (or JSONB column)
localStorage reports (sfm:v1:reports)→ public.reports
localStorage confirmations           → public.report_confirmations
demo Profile (React memory)          → public.profiles (linked to auth.users)
QR data-URL in memory                → Storage bucket `vehicle-qr` + profiles.qr_path
localStorage fill history            → public.fills
derive.ts confidence/ranking         → keep as pure fn over DB rows (or SQL view)
plate.ts / phone.ts / allowance.ts   → stay client (pure utilities)
```

Selectors like `nearbyStations(userLoc, radius, fuel)` swap their input source from the seed array to a Supabase query returning the same row shape, so components need minimal changes.

---

## 6. Lovable Cloud / Supabase Preparation (do not create yet)

Suggested tables:

- `stations` — id, name, address_my, address_en, lat, lng, is_active. Public read (`TO anon`).
- `station_fuels` — station_id, fuel_type, is_offered. Public read.
- `reports` — id, station_id, fuel_type, status, queue, note, reporter_id (auth.uid), created_at. Public read; insert restricted to authenticated user = reporter_id.
- `report_confirmations` — id, report_id, user_id, created_at; unique(report_id, user_id). Public read; insert as self.
- `profiles` — user_id PK = auth.users.id, name, vehicle_type, plate, fuel_type, engine_cc, phone_masked. Owner-only read/update.
- `fills` — id, user_id, station_id, fuel_type, liters, price_per_l, total, created_at. Owner-only read/insert.
- Storage bucket `vehicle-qr` — owner-only read/write on `user_id/*`.

Relationships: `reports.station_id → stations.id`; `report_confirmations.report_id → reports.id`; `profiles.user_id → auth.users.id`; `fills.station_id → stations.id`, `fills.user_id → auth.users.id`.

Security: RLS on every table; anon SELECT only on `stations`, `station_fuels`, `reports`, `report_confirmations`; owner-scoped policies for `profiles` and `fills`; explicit `GRANT`s required per the public-schema-grants rule; realtime publication on `reports` + `report_confirmations` if live updates are wanted.

---

## 7. Authentication Review

- **Today**: demo-only. Phone is normalized to `+959…`, kept in React memory, never verified, not unique, wiped on refresh. Label already says "Demo".
- **Keep for hackathon**: the multi-step sheet (phone → profile → view/edit), the access guard resume-once behavior, and the license-plate parity display.
- **With real auth**: replace `SessionProvider.setDemoPhone(...)` with `supabase.auth.signInWithOtp({ phone })` + verify OTP; on success, upsert `profiles` row keyed by `auth.uid()`. UI can stay identical — only the two verify functions change.
- **Phone OTP necessity**: needed for the stated product promise (one verified Myanmar mobile → one profile → abuse control on reports/confirmations). Provider cost/rate limits should be planned before switching; email/OAuth is out of scope per project rules.

---

## 8. UI Preservation Requirements

Must remain unchanged during backend work:

- Routes: `/`, `/station/$id`, `/report`, `/ask`.
- Components: `BottomNav` (fixed FAB, safe-area, red Report), `StationMap` (Leaflet, custom pump SVG markers, user pin, radius circle, z-index ordering with the permission overlay), `StationCard`, `AccountSheet` step order, `ProfileDashboard` (QR card, side-by-side Parity + Permission, allowance, calculator, history).
- Design tokens: ivory `#FAF8F3`, burnt-orange `#D84315`, charcoal `#18202B`; status green/amber/red/charcoal; Noto Sans Myanmar + Inter; 44px targets.
- Interactions: geolocation explainer before permission, radius chips default 2 km, guard resume-once, cooldown on confirmations, permission derived (not toggle).

---

## 9. Backend Integration Risk Analysis

- **UI regression**: switching data source to async can introduce loading/empty states that today are instant. Mitigate by seeding a `useSuspenseQuery` + skeleton that matches current card layout.
- **Losing demo data**: existing `localStorage` reports/confirmations/fills disappear when reads move to DB. Mitigate with a one-time migration-on-first-load that pushes local entries under the newly authenticated user, then clears the keys.
- **Recommendation logic drift**: `derive.ts` must stay the sole source of truth. Do not reimplement ranking in SQL initially — pass DB rows through the same pure functions.
- **Auth conflicts**: guard currently checks `session + completeProfile`. Real Supabase auth changes timing (async `getUser`, token refresh). Wrap in a query so the guard reads a stable value.
- **State conflicts**: two contexts (`FuelProvider`, `SessionProvider`) currently own everything. Introduce TanStack Query for server state and shrink both providers to UI-only concerns.
- **Performance**: Leaflet with many markers + per-render Haversine is fine at 10 stations; watch this at 100+. Add pagination or viewport-bbox queries early.
- **Realtime cost**: only enable Realtime on `reports`/`report_confirmations`; never on `stations`.
- **Server runtime**: Cloudflare Worker — no `sharp`, no `child_process`. QR is user-uploaded so no server image work is needed.

---

## 10. Final Recommendation — Integration Order

- **Phase 1 — Database foundation**: create `stations`, `station_fuels` with RLS + anon SELECT; seed from `stations.ts`; keep app pointing at the seed while wiring a read-only Supabase fetcher behind a feature flag.
- **Phase 2 — Data reads**: swap Discover/Detail/Ask to fetch stations via TanStack Query + `createServerFn` (or publishable client). No UI change; loading skeletons match card shape.
- **Phase 3 — Community writes**: add `reports` and `report_confirmations` with RLS; migrate `store.tsx` writes; run a one-time localStorage → DB import on first authenticated load.
- **Phase 4 — Authentication**: replace demo phone step with Supabase phone OTP; introduce `profiles` and `fills` with owner-only RLS; wire QR to Storage bucket; keep the same `AccountSheet` UI.
- **Phase 5 — Realtime + polish**: subscribe to `reports`/`report_confirmations` for live confidence updates; add abuse controls (rate limits, per-user cooldown) server-side; retire per-device cooldown.

Each phase is independently shippable and preserves the current UI and flows.

---

_End of report — no code, schema, or configuration was modified._
