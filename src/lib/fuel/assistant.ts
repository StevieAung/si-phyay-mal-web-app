import type { FuelType, Station, Report, FuelState, Confidence, FuelStatus, QueueLength } from "./types";
import { FUEL_TYPES } from "./types";
import {
  deriveFuelState,
  deriveStationStates,
  distanceKm,
  formatRelativeTime,
  rankForFuel,
  type RankedStation,
} from "./derive";

// ---------- Intent detection (Burmese + English) ----------

export type Intent =
  | { kind: "find"; fuel: FuelType | null }
  | { kind: "confidence"; fuel: FuelType | null; stationHint: string | null }
  | { kind: "explain"; fuel: FuelType | null }
  | { kind: "compare"; fuel: FuelType | null }
  | { kind: "shortest_queue"; fuel: FuelType | null }
  | { kind: "unknown" };

function detectFuel(text: string): FuelType | null {
  const t = text.toLowerCase();
  if (/premium\s*diesel|premium|ပရီမီယံ/.test(t)) return "Premium Diesel";
  if (/\bdiesel\b|ဒီဇယ်/.test(t)) return "Diesel";
  if (/\b95\b|၉၅/.test(t)) return "95";
  if (/\b92\b|၉၂/.test(t)) return "92";
  for (const f of FUEL_TYPES) if (t.includes(f.toLowerCase())) return f;
  return null;
}

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  const fuel = detectFuel(t);

  if (/\b(compare|vs|versus|better|which one)\b|နှိုင်း|ဘယ်ဆိုင်.*ကောင်း|ပိုကောင်း/.test(t))
    return { kind: "compare", fuel };
  if (/\b(why|explain|recommend|choose|chose|reason)\b|ဘာကြောင့်|အကြောင်းရင်း|ဘာဖြစ်လို့/.test(t))
    return { kind: "explain", fuel };
  if (/\b(confiden|trust|sure|reliab|accurate)\b|ယုံ|သေချာ|မှန်/.test(t))
    return { kind: "confidence", fuel, stationHint: null };
  if (/\b(shortest|short queue|less queue|no queue|fastest)\b|တန်းစီ.*(တို|နည်း)|တိုတို/.test(t))
    return { kind: "shortest_queue", fuel };
  if (/\b(nearest|closest|find|where|near me|nearby)\b|အနီး|ရှာ|ဘယ်မှာ|ဒီနား/.test(t))
    return { kind: "find", fuel };

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
  refs: StationRef[];
  disclaimer?: string;
}

const CONFIDENCE_MY: Record<Confidence, string> = {
  High: "မြင့်",
  Medium: "အလယ်အလတ်",
  Low: "နိမ့်",
  Conflicting: "ကွဲလွဲနေ",
};

const STATUS_MY: Record<FuelStatus, string> = {
  Available: "ရရှိနိုင်သည်",
  Limited: "အကန့်အသတ်ရှိ",
  "Sold Out": "ကုန်နေပြီ",
  Closed: "ပိတ်ထားသည်",
};

const QUEUE_MY: Record<QueueLength, string> = {
  "No Queue": "တန်းစီမရှိ",
  Short: "တိုတို",
  Medium: "အလယ်အလတ်",
  Long: "ရှည်",
};

const DISCLAIMER = "Community report များအပေါ် အခြေခံထားပါသည်။";

function locationNote(ctx: AssistantContext): string {
  return ctx.hasUserLocation ? "" : " (မန္တလေးမြို့လယ်မှ တွက်ချက်ထားပါသည်)";
}

function stationBlock(r: RankedStation): string {
  const q = r.state.queue ?? "No Queue";
  return [
    `📍 အကွာအဝေး — ${r.distanceKm.toFixed(1)} km`,
    `⛽ ဆီအခြေအနေ — ${STATUS_MY[r.state.status]}`,
    `🚗 တန်းစီ — ${QUEUE_MY[q]}`,
    `🕒 နောက်ဆုံး update — ${formatRelativeTime(r.state.updatedAt)}`,
    `✓ ယုံကြည်မှုအဆင့် — ${CONFIDENCE_MY[r.state.confidence]}`,
  ].join("\n");
}

function replyFind(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီအမျိုးအစား ရှာနေတာလဲ ခင်ဗျာ?\n92, 95, Diesel, သို့မဟုတ် Premium Diesel ကို ရွေးပေးပါ။",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin).slice(0, 3);
  if (ranked.length === 0) {
    return {
      text: `လက်ရှိတွင် ${fuel} ရရှိနိုင်သည့် ဆီဆိုင် မတွေ့ရသေးပါ။ နောက်မှ ပြန်ကြည့်ပါ။`,
      refs: [],
      disclaimer: DISCLAIMER,
    };
  }
  const top = ranked[0];
  const lines = [
    `အနီးဆုံး ${fuel} ဆီရနိုင်တဲ့ဆိုင် ${ranked.length} ဆိုင် တွေ့ရှိပါတယ်${locationNote(ctx)}။`,
    "",
    `အနီးဆုံးဆိုင်က **${top.station.name}** ဖြစ်ပါတယ်။`,
    "",
    stationBlock(top),
  ];
  if (ranked.length > 1) {
    lines.push("", "အခြားနီးစပ်တဲ့ဆိုင်များ:");
    for (const r of ranked.slice(1)) {
      lines.push(`• ${r.station.name} — ${r.distanceKm.toFixed(1)} km · ${STATUS_MY[r.state.status]} · ${QUEUE_MY[r.state.queue ?? "No Queue"]}`);
    }
  }
  return {
    text: lines.join("\n"),
    refs: ranked.map((r) => ({ stationId: r.station.id, stationName: r.station.name, fuelType: fuel })),
    disclaimer: DISCLAIMER,
  };
}

function replyShortestQueue(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) return replyFind(fuel, ctx);
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  if (ranked.length === 0) {
    return { text: `${fuel} အတွက် ဖွင့်ထားသော ဆိုင် မတွေ့ရပါ။`, refs: [], disclaimer: DISCLAIMER };
  }
  const order: QueueLength[] = ["No Queue", "Short", "Medium", "Long"];
  const sorted = [...ranked].sort(
    (a, b) => order.indexOf(a.state.queue ?? "No Queue") - order.indexOf(b.state.queue ?? "No Queue"),
  );
  const top = sorted[0];
  return {
    text: [
      `တန်းစီ အတိုဆုံးက **${top.station.name}** (${fuel}) ဖြစ်ပါတယ်။`,
      "",
      stationBlock(top),
    ].join("\n"),
    refs: sorted.slice(0, 3).map((r) => ({ stationId: r.station.id, stationName: r.station.name, fuelType: fuel })),
    disclaimer: DISCLAIMER,
  };
}

function replyExplain(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီအမျိုးအစား အတွက် ရှင်းပြရမလဲ ခင်ဗျာ? (92, 95, Diesel, Premium Diesel)",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  const top = ranked[0];
  if (!top) return { text: `${fuel} အတွက် အကြံပြုနိုင်တဲ့ ဆိုင် မတွေ့ရပါ။`, refs: [], disclaimer: DISCLAIMER };

  return {
    text: [
      `**${top.station.name}** ကို အကြံပြုထားရတဲ့ အကြောင်းများ:`,
      "",
      `✓ သင့်တည်နေရာနှင့် နီးပါသည် (${top.distanceKm.toFixed(1)} km)`,
      `✓ ဆီအခြေအနေ — ${STATUS_MY[top.state.status]}`,
      `✓ တန်းစီချိန် — ${QUEUE_MY[top.state.queue ?? "No Queue"]}`,
      `✓ Community ယုံကြည်မှုအဆင့် — ${CONFIDENCE_MY[top.state.confidence]}`,
      `✓ နောက်ဆုံး update — ${formatRelativeTime(top.state.updatedAt)}`,
    ].join("\n"),
    refs: [{ stationId: top.station.id, stationName: top.station.name, fuelType: fuel }],
    disclaimer: DISCLAIMER,
  };
}

function replyConfidence(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return {
      text: "ဘယ်ဆီ (92, 95, Diesel, Premium Diesel) အတွက် ယုံကြည်မှုအဆင့်ကို စစ်ချင်တာလဲ ခင်ဗျာ?",
      refs: [],
    };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin);
  const top = ranked[0];
  if (!top) return { text: `${fuel} အတွက် data မတွေ့ရပါ။`, refs: [], disclaimer: DISCLAIMER };
  const s = top.state;
  return {
    text: [
      `**${top.station.name}** (${fuel}) ရဲ့ အချက်အလက်မှာ ယုံကြည်မှုအဆင့် — **${CONFIDENCE_MY[s.confidence]}** ရှိပါတယ်။`,
      "",
      "အကြောင်းရင်းများ:",
      `✓ နောက်ဆုံး update — ${formatRelativeTime(s.updatedAt)}`,
      `✓ Community report — ${s.confirmations} ခု အတည်ပြုထားသည်`,
      `✓ ကွဲလွဲသည့် report — ${s.conflicting} ခု`,
      "",
      "မှတ်ချက်: ဆီဆိုင်အခြေအနေများသည် အချိန်နှင့်အမျှ ပြောင်းလဲနိုင်ပါသည်။",
    ].join("\n"),
    refs: [{ stationId: top.station.id, stationName: top.station.name, fuelType: fuel }],
    disclaimer: DISCLAIMER,
  };
}

function replyCompare(fuel: FuelType | null, ctx: AssistantContext): AssistantReply {
  if (!fuel) {
    return { text: "ဘယ်ဆီအမျိုးအစား နှိုင်းယှဉ်ချင်တာလဲ ခင်ဗျာ? (92, 95, Diesel, Premium Diesel)", refs: [] };
  }
  const ranked = rankForFuel(fuel, ctx.stations, ctx.reports, ctx.origin).slice(0, 2);
  if (ranked.length < 2) {
    return { text: `နှိုင်းယှဉ်ရန် ${fuel} ဆိုင် ၂ ခု မတွေ့ရပါ။`, refs: [], disclaimer: DISCLAIMER };
  }
  const [a, b] = ranked;
  return {
    text: [
      `**ဆိုင် A — ${a.station.name}**`,
      stationBlock(a),
      "",
      `**ဆိုင် B — ${b.station.name}**`,
      stationBlock(b),
    ].join("\n"),
    refs: ranked.map((r) => ({ stationId: r.station.id, stationName: r.station.name, fuelType: fuel })),
    disclaimer: DISCLAIMER,
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
          "မင်္ဂလာပါ! ကျွန်ုပ်က **ဆီရှာဖွေရေး လက်ထောက်** ပါ။",
          "အောက်ပါတို့ကို မေးနိုင်ပါသည်:",
          "",
          "• အနီးဆုံး Diesel/92/95 ဆီဆိုင်",
          "• တန်းစီ တိုတိုသည့် ဆိုင်",
          "• ဆိုင်ရဲ့ ယုံကြည်မှုအဆင့်",
          "• ဘာကြောင့် ဒီဆိုင်ကို အကြံပြုတာလဲ",
          "• ဆိုင်နှစ်ခု နှိုင်းယှဉ်ရန်",
        ].join("\n"),
        refs: [],
      };
  }
}

// Public helper — future LLM swap point (keep signature stable).
export function answer(text: string, ctx: AssistantContext): AssistantReply {
  return buildReply(detectIntent(text), ctx);
}

export { deriveFuelState, deriveStationStates, distanceKm };
export type { FuelState };
