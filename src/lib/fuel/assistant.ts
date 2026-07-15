import type { FuelType, Station, Report, FuelState, Confidence } from "./types";
import { FUEL_TYPES } from "./types";
import {
  deriveFuelState,
  deriveStationStates,
  distanceKm,
  formatRelativeTime,
  rankForFuel,
  type RankedStation,
} from "./derive";

// ---------- Intent detection ----------

export type Intent =
  | { kind: "find"; fuel: FuelType | null }
  | { kind: "confidence"; fuel: FuelType | null; stationHint: string | null }
  | { kind: "explain"; fuel: FuelType | null }
  | { kind: "compare"; fuel: FuelType | null }
  | { kind: "shortest_queue"; fuel: FuelType | null }
  | { kind: "unknown" };

function detectFuel(text: string): FuelType | null {
  const t = text.toLowerCase();
  if (/\bpremium\s*diesel\b|premium/.test(t)) return "Premium Diesel";
  if (/\bdiesel\b|ဒီဇယ်/.test(t)) return "Diesel";
  if (/\b95\b/.test(t)) return "95";
  if (/\b92\b/.test(t)) return "92";
  // Match any known fuel exactly
  for (const f of FUEL_TYPES) if (t.includes(f.toLowerCase())) return f;
  return null;
}

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  const fuel = detectFuel(t);

  if (/\b(compare|vs|versus|better|which one)\b|နှိုင်း/.test(t))
    return { kind: "compare", fuel };
  if (/\b(why|explain|recommend|choose|chose|reason)\b|ဘာကြောင့်/.test(t))
    return { kind: "explain", fuel };
  if (/\b(confiden|trust|sure|reliab|accurate)\b|ယုံ|သေချာ/.test(t))
    return { kind: "confidence", fuel, stationHint: null };
  if (/\b(shortest|short queue|less queue|no queue|fastest)\b|တန်းစီ.*တို|တိုတို/.test(t))
    return { kind: "shortest_queue", fuel };
  if (/\b(nearest|closest|find|where|near me|nearby)\b|အနီး|ရှာ|ဘယ်မှာ/.test(t))
    return { kind: "find", fuel };

  // If only a fuel name was given, treat as find
  if (fuel) return { kind: "find", fuel };
  return { kind: "unknown" };
}

// ---------- Response building ----------

export interface AssistantContext {
  stations: Station[];
  reports: Report[];
  origin: { lat: number; lng: number };
  hasUserLocation: boolean;
}

export interface StationRef {
  stationId: string;
  stationName: string;
  fuelType: FuelType;
}

export interface AssistantReply {
  text: string;
  refs: StationRef[]; // Actionable "View station" links
  disclaimer?: string;
}

const CONFIDENCE_MY: Record<Confidence, string> = {
  High: "မြင့်မားသော",
  Medium: "အလယ်အလတ်",
  Low: "နိမ့်သော",
  Conflicting: "ကွဲလွဲနေသော",
};

function locationNote(ctx: AssistantContext): string {
  return ctx.hasUserLocation
    ? ""
    : " (မန္တလေးမြို့လယ်မှ တွက်ချက်ထားပါသည်)";
}

function fmtStationLine(r: RankedStation): string {
  const q = r.state.queue ?? "No Queue";
  return `• ${r.station.name} — ${r.distanceKm.toFixed(1)} km, ${r.state.status}, ${q}, ${formatRelativeTime(r.state.updatedAt)}`;
}

function replyFind(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီအမျိုးအစား ရှာနေတာလဲ ခင်ဗျာ? 92, 95, Diesel, သို့မဟုတ် Premium Diesel ကို ရွေးပေးပါ။",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin).slice(0, 3);
  if (ranked.length === 0) {
    return {
      text: `လက်ရှိတွင် ${fuel} ရရှိနိုင်သည့် ဆီဆိုင် (Community reports အရ) မတွေ့ရသေးပါ။ နောက်မှ ပြန်ကြည့်ပါ။`,
      refs: [],
    };
  }
  const top = ranked[0];
  const lines = [
    `${fuel} ရရှိနိုင်သည့် ${ranked.length} ဆိုင် တွေ့ရှိပါသည်${locationNote(ctx)}။`,
    "",
    `အနီးဆုံးက **${top.station.name}** — ${top.distanceKm.toFixed(1)} km အကွာ။`,
    `နောက်ဆုံး community report သည် ${formatRelativeTime(top.state.updatedAt)}, confidence: ${CONFIDENCE_MY[top.state.confidence]} (${top.state.confidence})။`,
    "",
    ...ranked.slice(1).map(fmtStationLine),
  ];
  return {
    text: lines.join("\n"),
    refs: ranked.map((r) => ({
      stationId: r.station.id,
      stationName: r.station.name,
      fuelType: fuel,
    })),
    disclaimer: "Based on community reports · အသိုင်းအဝိုင်း အစီရင်ခံစာများပေါ်တွင် အခြေခံသည်။",
  };
}

function replyShortestQueue(
  fuel: FuelType | null,
  ctx: AssistantContext,
): AssistantReply {
  if (!fuel) return replyFind(fuel, ctx);
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  if (ranked.length === 0) {
    return { text: `${fuel} အတွက် ဖွင့်ထားသော ဆိုင် မတွေ့ရပါ။`, refs: [] };
  }
  const sorted = [...ranked].sort((a, b) => {
    const qa = a.state.queue ?? "No Queue";
    const qb = b.state.queue ?? "No Queue";
    const order = ["No Queue", "Short", "Medium", "Long"];
    return order.indexOf(qa) - order.indexOf(qb);
  });
  const top = sorted[0];
  return {
    text: [
      `တန်းစီ အတိုဆုံးက **${top.station.name}** ${fuel} — ${top.state.queue ?? "No Queue"}, ${top.distanceKm.toFixed(1)} km, ${formatRelativeTime(top.state.updatedAt)}။`,
      "",
      ...sorted.slice(1, 3).map(fmtStationLine),
    ].join("\n"),
    refs: sorted.slice(0, 3).map((r) => ({
      stationId: r.station.id,
      stationName: r.station.name,
      fuelType: fuel,
    })),
    disclaimer: "Based on community reports.",
  };
}

function replyExplain(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ် fuel အတွက် ရှင်းပြရမလဲ ခင်ဗျာ? 92, 95, Diesel, Premium Diesel ကို ရွေးပေးပါ။",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  const top = ranked[0];
  if (!top) return { text: `${fuel} အတွက် recommend လုပ်နိုင်သည့် ဆိုင် မတွေ့ရပါ။`, refs: [] };

  const checks: string[] = [];
  checks.push(`✓ ${top.state.status} (community reports)`);
  checks.push(`✓ ${top.distanceKm.toFixed(1)} km အနီး`);
  checks.push(`✓ တန်းစီ: ${top.state.queue ?? "No Queue"}`);
  checks.push(`✓ Confidence: ${CONFIDENCE_MY[top.state.confidence]}`);
  checks.push(`✓ Update: ${formatRelativeTime(top.state.updatedAt)}`);

  return {
    text: [
      `**${top.station.name}** ကို အကြံပြုရသည့် အကြောင်းရင်း:`,
      "",
      ...checks,
    ].join("\n"),
    refs: [
      { stationId: top.station.id, stationName: top.station.name, fuelType: fuel },
    ],
    disclaimer: "Ranking: availability → queue → freshness → distance → confirmations.",
  };
}

function replyConfidence(
  fuel: FuelType | null,
  ctx: AssistantContext,
): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီ (92, 95, Diesel, Premium Diesel) အတွက် confidence ကို စစ်ချင်တာလဲ ခင်ဗျာ?",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  const top = ranked[0];
  if (!top) return { text: `${fuel} အတွက် data မတွေ့ရပါ။`, refs: [] };
  const s = top.state;
  return {
    text: [
      `**${top.station.name}** ${fuel} status confidence: **${CONFIDENCE_MY[s.confidence]} (${s.confidence})**`,
      "",
      `• Community confirmations: ${s.confirmations}`,
      `• နောက်ဆုံး update: ${formatRelativeTime(s.updatedAt)}`,
      `• ကွဲလွဲသည့် reports: ${s.conflicting}`,
      "",
      "အခြေအနေများ လျင်မြန်စွာ ပြောင်းလဲနိုင်ပါသည်။",
    ].join("\n"),
    refs: [
      { stationId: top.station.id, stationName: top.station.name, fuelType: fuel },
    ],
    disclaimer: "Based on community reports.",
  };
}

function replyCompare(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီအမျိုးအစား နှိုင်းချင်တာလဲ ခင်ဗျာ?",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin).slice(0, 2);
  if (ranked.length < 2) {
    return { text: `နှိုင်းယှဉ်ရန် ${fuel} ဆိုင် ၂ ခု မတွေ့ရပါ။`, refs: [] };
  }
  const [a, b] = ranked;
  const block = (r: RankedStation) =>
    [
      `**${r.station.name}**`,
      `  • ${r.distanceKm.toFixed(1)} km`,
      `  • ${r.state.status}, ${r.state.queue ?? "No Queue"}`,
      `  • Confidence: ${CONFIDENCE_MY[r.state.confidence]}`,
      `  • Update: ${formatRelativeTime(r.state.updatedAt)}`,
    ].join("\n");
  return {
    text: [block(a), "", block(b)].join("\n"),
    refs: ranked.map((r) => ({
      stationId: r.station.id,
      stationName: r.station.name,
      fuelType: fuel,
    })),
    disclaimer: "Based on community reports.",
  };
}

export function buildReply(intent: Intent, ctx: AssistantContext): AssistantReply {
  switch (intent.kind) {
    case "find":
      return replyFind(intent.fuel, ctx);
    case "shortest_queue":
      return replyShortestQueue(intent.fuel, ctx);
    case "explain":
      return replyExplain(intent.fuel, ctx);
    case "confidence":
      return replyConfidence(intent.fuel, ctx);
    case "compare":
      return replyCompare(intent.fuel, ctx);
    default:
      return {
        text: [
          "မင်္ဂလာပါ! ကျွန်ုပ်က ဆီရှာဖွေရေး လက်ထောက်ပါ။",
          "အောက်ပါတို့ကို မေးနိုင်ပါသည်:",
          "• အနီးဆုံး Diesel/92/95 ဆိုင်",
          "• တန်းစီ တိုတိုသည့် ဆိုင်",
          "• Confidence ဘယ်လောက် ယုံရလဲ",
          "• ဘာကြောင့် ဒီဆိုင်ကို အကြံပြုတာလဲ",
          "• ဆိုင်နှစ်ခု နှိုင်းယှဉ်ရန်",
        ].join("\n"),
        refs: [],
      };
  }
}

// Public helper for future LLM swap: same signature, different implementation.
export function answer(text: string, ctx: AssistantContext): AssistantReply {
  return buildReply(detectIntent(text), ctx);
}

// Re-export for convenience in UI
export { deriveFuelState, deriveStationStates };
export type { FuelState };
