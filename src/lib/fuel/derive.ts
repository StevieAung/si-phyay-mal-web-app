import type {
  Confidence,
  FuelState,
  FuelType,
  QueueLength,
  Report,
  Station,
} from "./types";

const FRESH_MS = 30 * 60_000; // 30 minutes
const STALE_MS = 60 * 60_000; // 1 hour

export interface ReportGroup {
  matching: Report[];
  conflicting: Report[];
  latest: Report;
}

function groupReports(reports: Report[]): ReportGroup | null {
  if (reports.length === 0) return null;
  const sorted = [...reports].sort((a, b) => b.timestamp - a.timestamp);
  const latest = sorted[0];
  const matching: Report[] = [];
  const conflicting: Report[] = [];
  for (const r of sorted) {
    if (r.status === latest.status && r.queue === latest.queue) matching.push(r);
    else conflicting.push(r);
  }
  return { matching, conflicting, latest };
}

function totalConfirmations(matching: Report[]): number {
  // Each matching report is itself one data point; confirmationCount are the
  // "Still accurate" taps on top of that report.
  let total = 0;
  for (const r of matching) total += 1 + r.confirmationCount;
  return total;
}

function computeConfidence(group: ReportGroup, nowMs: number): Confidence {
  const ageMs = nowMs - group.latest.timestamp;
  const fresh = ageMs <= FRESH_MS;
  const stale = ageMs > STALE_MS;
  const matchingCount = group.matching.length;
  const confirmations = totalConfirmations(group.matching);
  const conflicts = group.conflicting.filter((r) => nowMs - r.timestamp <= STALE_MS).length;

  // Recent conflicting evidence dominates.
  if (conflicts >= Math.max(1, matchingCount) && conflicts > 0) return "Conflicting";
  if (stale) return "Low";
  // A lone report — even with many "Still accurate" taps — never rises to High.
  if (matchingCount < 2) return fresh && confirmations >= 2 ? "Medium" : "Low";
  if (fresh && confirmations >= 4) return "High";
  if (fresh && confirmations >= 2) return "Medium";
  return "Low";
}

export function deriveFuelState(
  station: Station,
  fuelType: FuelType,
  reports: Report[],
  nowMs = Date.now(),
): FuelState | null {
  const relevant = reports.filter(
    (r) => r.stationId === station.id && r.fuelType === fuelType,
  );
  const group = groupReports(relevant);
  if (!group) return null;
  return {
    fuelType,
    status: group.latest.status,
    queue: group.latest.status === "Closed" || group.latest.status === "Sold Out"
      ? null
      : group.latest.queue,
    updatedAt: group.latest.timestamp,
    confirmations: totalConfirmations(group.matching),
    conflicting: group.conflicting.length,
    confidence: computeConfidence(group, nowMs),
  };
}

export function deriveStationStates(
  station: Station,
  reports: Report[],
  nowMs = Date.now(),
): FuelState[] {
  return station.offeredFuels
    .map((f) => deriveFuelState(station, f, reports, nowMs))
    .filter((s): s is FuelState => s !== null);
}

const R = 6371; // km
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const QUEUE_RANK: Record<QueueLength, number> = {
  "No Queue": 0,
  Short: 1,
  Medium: 2,
  Long: 3,
};

export interface RankedStation {
  station: Station;
  state: FuelState;
  distanceKm: number;
  score: number;
}

/**
 * Ranking (per Project Knowledge):
 * 1. Exclude Closed and Sold Out
 * 2. Require the selected fuel type
 * 3. Prefer shorter queues
 * 4. Prefer fresher reports
 * 5. Prefer shorter distance
 * 6. Prefer more confirmations
 */
export function rankForFuel(
  fuelType: FuelType,
  stations: Station[],
  reports: Report[],
  origin: { lat: number; lng: number },
  nowMs = Date.now(),
): RankedStation[] {
  const rows: RankedStation[] = [];
  for (const s of stations) {
    if (!s.offeredFuels.includes(fuelType)) continue;
    const state = deriveFuelState(s, fuelType, reports, nowMs);
    if (!state) continue;
    if (state.status === "Closed" || state.status === "Sold Out") continue;
    const d = distanceKm(origin, { lat: s.lat, lng: s.lng });
    const queueRank = state.queue ? QUEUE_RANK[state.queue] : 0;
    const ageMin = (nowMs - state.updatedAt) / 60_000;
    // Lower is better
    const score =
      queueRank * 100 + ageMin * 0.5 + d * 5 - state.confirmations * 2;
    rows.push({ station: s, state, distanceKm: d, score });
  }
  return rows.sort((a, b) => a.score - b.score);
}

export function formatRelativeTime(ts: number, nowMs = Date.now()): string {
  const diff = Math.max(0, nowMs - ts);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now / ခုလေးတင်";
  if (mins < 60) return `${mins} min ago / ${mins} မိနစ်က`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago / ${hrs} နာရီက`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago / ${days} ရက်က`;
}

export function isOutdated(ts: number, nowMs = Date.now()): boolean {
  return nowMs - ts > STALE_MS;
}
