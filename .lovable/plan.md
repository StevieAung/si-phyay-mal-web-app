# ဆီဖြည့်မယ် — Implementation Status Report

Read-only audit. No code, files, or configuration will be changed. The recent async build error is noted at the end but not addressed here, per your instructions.

## 1. Overall Project Status

Mobile-first, frontend-only community fuel app for Mandalay. Foundation, theme, Leaflet map, filters, seed data, local report persistence, deterministic Ask, geolocation + radius, and a demo phone/profile session are all in place. No backend, no real auth, no cross-device sync.

- Fully implemented: Discover, Station Detail, Report, Ask, Account Sheet, local report persistence, plate parity utility, Haversine radius filtering, protected-action guard.
- Partially implemented: Directions (Google Maps deep link only — by design), Auth (demo only), Profile (memory only).
- Missing (intentional non-goals this checkpoint): real OTP, backend, realtime, notifications, payments, predictive availability.

## 2. Pages & Screens

| Screen | Purpose | Main UI | Functionality | Status |
|---|---|---|---|---|
| `/` Discover | Map-first browsing | Brand header, Mandalay chip, account icon, search, fuel filters, radius (2/5/10/All), Leaflet map, legend, Ask CTA, nearby stations sheet | Search, filter, radius, map/list, geolocation w/ user pin | Complete |
| `/station/$id` Detail | Deep station view | Address, distance, per-fuel table, latest 3 reports, confirmations, confidence, Directions, Report, Still-accurate | Full evidence; Directions & confirm are guarded | Complete |
| `/report` Report | Submit report | Station picker, fuel type, status, queue, validation, success | In-memory + localStorage; guarded | Complete |
| `/ask` Ask | Deterministic recommendation | Quick prompts, ranked top-3, View station | `rankForFuel`; labeled "Based on community reports" | Complete |
| Account Sheet | Demo sign-in / profile | Phone → Profile → View/Edit | Memory-only session, sign out | Complete (demo) |
| Location Explainer Dialog | Pre-permission explainer | Text + Accept/Skip | Gates browser prompt | Complete |
| 404 Not Found | Fallback | Message + Go Home | Static | Complete |
| Root Error Boundary | Runtime error UI | Retry + Home | Wired via `router.invalidate()` | Complete |

## 3. Features

| Feature | Works | Doesn't Work | ~% |
|---|---|---|---|
| Leaflet Map + OSM | Custom SVG pump pins, user pin, radius circle | No offline fallback | 100 |
| Search | Name/address substring | — | 100 |
| Fuel Filters | 92/95/Diesel/Premium multi-select | — | 100 |
| Radius Filter | 2/5/10/All, Haversine | Needs geolocation | 100 |
| Current Location | Explainer, permission, denied/timeout/unavailable/unsupported | Not persisted (by design) | 100 |
| Station Cards | Status, queue, freshness, distance, confidence | — | 100 |
| Station Detail | Per-fuel state, latest 3 reports | — | 100 |
| Fuel Availability | Available/Limited/Sold Out/Closed | — | 100 |
| Queue Status | 4 levels, suppressed on Closed/Sold Out | — | 100 |
| Confidence | High/Med/Low/Conflicting derived | — | 100 |
| Freshness | Relative time + outdated warning | — | 100 |
| Report History | Seeded + user reports; `sfm:v1:reports` | Local device only | 100 (local) |
| Ask / Recommendation | Exclude Closed/SoldOut → queue → freshness → distance → confirmations | Not a real LLM (correctly labeled) | 100 |
| Directions | Google Maps deep link | No in-app nav (out of scope) | 100 |
| Add Report | Validated, guarded, persisted | — | 100 |
| Confirm Report | 60s per-device cooldown | Guarded | 100 |
| Authentication | Demo phone entry + normalization | No SMS/verification/uniqueness | 100 of demo scope |
| Profile | Name, vehicle, plate, consent | Memory only, lost on refresh | 100 of demo scope |
| License Plate Parsing | MM→Latin digits, 2-digits-before-letter rule | Rejects malformed with clear error | 100 |
| Odd/Even (စုံ/မ) Badge | Informational with disclaimer | No hard-coded policy (correct) | 100 |
| Guest Access | Full browse/detail/Ask without login | — | 100 |
| Protected Actions | `requireCompleteProfile` guard, one-shot resume | — | 100 |
| Bottom Navigation | Fixed, safe-area, red center Report FAB | — | 100 |

## 4. User Flows

- Guest browsing — open `/`, search/filter/radius, tap card or marker → detail. Fully functional.
- Location — first visit explainer → accept → geolocation → blue pin + radius; denial/timeout handled. Fully functional.
- Ask — `/ask` → prompt → ranked top-3 → View station. Fully functional.
- Add Report — FAB → guard opens Account Sheet if no profile → phone → profile → resumes form → submit → success. Fully functional (demo auth).
- Confirm Report — Detail → Still accurate → guard → confirm → cooldown recorded. Fully functional.
- Directions — Detail → Directions → guard → Google Maps in new tab. Fully functional.
- Auth/Profile — Account icon → phone → profile → view/edit/sign out. Fully functional as demo.

## 5. Navigation Structure

- File-based TanStack routes: `/`, `/station/$id`, `/report`, `/ask`, plus root shell + `sitemap.xml`.
- Fixed BottomNav: Discover (left), Report FAB (elevated center), Ask (right).
- Entry point: `/` Discover, no login required.
- No route-level protection. Guarding is per-action via `SessionProvider.requireCompleteProfile`.
- Header: brand + Mandalay chip + top-right account icon → Account Sheet.

## 6. Data

- Static seed: 10 Mandalay stations in `src/lib/fuel/stations.ts` including the fixed Diesel Long-Queue-5min vs Short-Queue-8min pair.
- Seed reports via `seedReports()`.
- React state: filters, search, radius, map/list toggle, session, profile, pending intent, geolocation coords.
- localStorage keys: `sfm:v1:reports`, `sfm:v1:deviceId`, `sfm:v1:confirmCooldown`.
- Backend: none. TanStack Query provider present but unused for reads.
- Coordinates, full phone, plate: memory only (never persisted).

## 7. Technical Architecture

- Stack: TanStack Start + Vite + React 19 + strict TS + Tailwind v4 + Leaflet/react-leaflet + TanStack Query provider.
- Structure:
  - `src/routes/` file-based routes
  - `src/components/fuel/` AppShell, BottomNav, AccountSheet, FuelFilter, StationCard, StationMap, StatusBadge, QueueBadge
  - `src/lib/fuel/` types, stations, store (reports), session (demo auth), derive (confidence/rank/haversine), phone, plate
  - `src/hooks/useGeolocation.ts`
- Contexts: `FuelProvider`, `SessionProvider`, `QueryClientProvider`.
- State: React Context + `useState`; localStorage for reports/deviceId/cooldowns only.

## 8. UI Status

- Theme: warm ivory `#FAF8F3`, burnt-orange `#D84315`, deep charcoal `#18202B`.
- Semantic status colors: green Available, amber Limited, red Sold Out, charcoal Closed — always paired with icon/text.
- Typography: Noto Sans Myanmar + Inter; Burmese primary with short English hints.
- Components: rounded-2xl surfaces, thin warm-gray borders, restrained shadows, ≥44px touch targets.
- Mobile: 390px target, fixed BottomNav with `env(safe-area-inset-bottom)`, `max-w-lg` container.
- Map: custom SVG pump pins, translucent user radius, compact bottom-left legend.

## 9. Missing MVP Features (vs long-term intent)

- Real Myanmar phone OTP auth + uniqueness enforcement (backend).
- Cross-device / shared report persistence.
- Server-side confidence aggregation across devices.
- Realtime updates.
- Lovable Cloud / Supabase tables, RLS, Edge Functions, secrets.
- Automated tests / e2e.

All of the above are explicit non-goals for this frontend checkpoint.

## 10. Final Summary

| Feature | Status | Notes |
|---|---|---|
| Discover | Complete | Map-first, header, search, filters, radius, sheet |
| Leaflet Map | Complete | OSM tiles, pump pins, user pin, radius |
| Search | Complete | Substring |
| Fuel Filters | Complete | 92/95/Diesel/Premium |
| Radius Filter | Complete | 2/5/10/All km, Haversine |
| Current Location | Complete | Explainer + all error states |
| Station Cards | Complete | Status/queue/freshness/distance/confidence |
| Station Detail | Complete | Latest 3 reports, per-fuel table |
| Fuel Availability | Complete | 4 statuses |
| Queue Status | Complete | Suppressed on Closed/Sold Out |
| Confidence | Complete | High/Med/Low/Conflicting |
| Freshness | Complete | Relative time + outdated warning |
| Report History | Complete | localStorage `sfm:v1:reports` |
| Ask / Recommendation | Complete | Deterministic, labeled |
| Directions | Complete | Google Maps deep link, guarded |
| Add Report | Complete | Guarded, validated, persisted |
| Confirm Report | Complete | 60s cooldown |
| Guest Access | Complete | Browse/Ask without login |
| Protected Actions Guard | Complete | requireCompleteProfile + resume |
| Demo Auth (phone sheet) | Partial | Demo only, no SMS/verification |
| Profile | Partial | Memory-only, lost on refresh (by design) |
| License Plate Parsing | Complete | Two-digits-before-letter rule |
| Odd/Even (စုံ/မ) Badge | Complete | Informational + disclaimer |
| Bottom Navigation | Complete | Fixed, red center FAB, safe-area |
| Real OTP Authentication | Not Implemented | Out of scope this checkpoint |
| Backend / Cloud Persistence | Not Implemented | Frontend-only checkpoint |
| Cross-device sync / Realtime | Not Implemented | Requires backend |
| Notifications | Not Implemented | Not planned |
| In-app Turn-by-turn Nav | Not Implemented | Uses Google Maps deep link |
| Payments | Not Implemented | Non-goal |
| Automated Tests | Not Implemented | None present |

---

Note on the earlier async build failure: the truncated stderr shows a Vite/TanStack Start plugin failure during `build:dev` but doesn't include the root-cause line. Per your instructions, no changes were made. If you'd like, approve a follow-up plan and I'll switch to build mode to diagnose and fix it.
