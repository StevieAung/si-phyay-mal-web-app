import type { Report, Station } from "./types";

const now = () => Date.now();

export const SEED_STATIONS: Station[] = [
  {
    id: "st-denko-73",
    name: "Denko ၇၃လမ်း",
    nameEn: "Denko 73rd Street",
    address: "၇၃လမ်း၊ သီရိမာလာအရှေ့ရပ်ကွက်",
    township: "ချမ်းအေးသာဇံ",
    lat: 21.9755,
    lng: 96.0836,
    offeredFuels: ["92", "95", "Diesel"],
  },
  {
    id: "st-max-strand",
    name: "Max ဗိုလ်ချုပ်",
    nameEn: "Max Bogyoke",
    address: "ဗိုလ်ချုပ်လမ်း၊ ၂၆လမ်းထောင့်",
    township: "အောင်မြေသာစံ",
    lat: 21.9812,
    lng: 96.0894,
    offeredFuels: ["92", "95", "Diesel", "Premium Diesel"],
  },
  {
    id: "st-shwe-byain-phyu",
    name: "ရွှေဘိုင်ဖြူ ၃၅လမ်း",
    nameEn: "Shwe Byain Phyu 35th",
    address: "၃၅လမ်း၊ ၈၀လမ်းနှင့် ၈၁လမ်းကြား",
    township: "မဟာအောင်မြေ",
    lat: 21.9683,
    lng: 96.0778,
    offeredFuels: ["92", "Diesel", "Premium Diesel"],
  },
  {
    id: "st-parami-62",
    name: "ပါရမီ ၆၂လမ်း",
    nameEn: "Parami 62nd Street",
    address: "၆၂လမ်း၊ သီပေါလမ်းထောင့်",
    township: "ချမ်းမြသာစည်",
    lat: 21.9591,
    lng: 96.0904,
    offeredFuels: ["92", "95", "Diesel"],
  },
  {
    id: "st-st-oil-yadanabon",
    name: "ST Oil ရတနာပုံ",
    nameEn: "ST Oil Yadanabon",
    address: "မန္တလေး-လားရှိုးလမ်း၊ ရတနာပုံ",
    township: "ပြင်ဦးလွင်လမ်း",
    lat: 21.9924,
    lng: 96.1052,
    offeredFuels: ["92", "95", "Diesel", "Premium Diesel"],
  },
  {
    id: "st-mps-84",
    name: "MPS ၈၄လမ်း",
    nameEn: "MPS 84th Street",
    address: "၈၄လမ်း၊ ၃၀လမ်းနှင့် ၃၁လမ်းကြား",
    township: "ချမ်းအေးသာဇံ",
    lat: 21.9776,
    lng: 96.0803,
    offeredFuels: ["92", "Diesel"],
  },
  {
    id: "st-denko-airport",
    name: "Denko လေဆိပ်လမ်း",
    nameEn: "Denko Airport Road",
    address: "မန္တလေး-လေဆိပ်လမ်း",
    township: "အမရပူရ",
    lat: 21.9052,
    lng: 96.0973,
    offeredFuels: ["92", "95", "Diesel"],
  },
  {
    id: "st-cnpc-90",
    name: "CNPC ၉၀လမ်း",
    nameEn: "CNPC 90th Street",
    address: "၉၀လမ်း၊ ၁၉လမ်းထောင့်",
    township: "အောင်မြေသာစံ",
    lat: 21.9857,
    lng: 96.0741,
    offeredFuels: ["92", "95", "Diesel", "Premium Diesel"],
  },
  {
    id: "st-national-mahaaung",
    name: "National မဟာအောင်မြေ",
    nameEn: "National Mahaaungmyay",
    address: "၆၅လမ်း၊ မနော်ဟရီလမ်း",
    township: "မဟာအောင်မြေ",
    lat: 21.9548,
    lng: 96.0821,
    offeredFuels: ["92", "Diesel"],
  },
  {
    id: "st-max-sagaing-bridge",
    name: "Max စစ်ကိုင်းတံတား",
    nameEn: "Max Sagaing Bridge",
    address: "စစ်ကိုင်း-မန္တလေးလမ်း",
    township: "အောင်မြေသာစံ",
    lat: 21.9942,
    lng: 96.0653,
    offeredFuels: ["92", "95", "Diesel", "Premium Diesel"],
  },
];

const min = (n: number) => n * 60_000;

/**
 * Fixed demo seed reports. Includes the required Diesel comparison:
 * - Parami 62nd: Diesel, Long Queue, ~5 minutes ago
 * - Shwe Byain Phyu 35th: Diesel, Short Queue, ~8 minutes ago
 */
export function seedReports(): Report[] {
  const t = now();
  const r = (
    stationId: string,
    fuelType: Report["fuelType"],
    status: Report["status"],
    queue: Report["queue"],
    ageMin: number,
    deviceId = "seed",
  ): Report => ({
    id: `seed-${stationId}-${fuelType}-${ageMin}-${Math.random().toString(36).slice(2, 7)}`,
    stationId,
    fuelType,
    status,
    queue,
    timestamp: t - min(ageMin),
    deviceId,
  });

  return [
    // Required demo pair — Diesel comparison
    r("st-parami-62", "Diesel", "Available", "Long", 5),
    r("st-parami-62", "Diesel", "Available", "Long", 12, "seed-2"),
    r("st-shwe-byain-phyu", "Diesel", "Available", "Short", 8),
    r("st-shwe-byain-phyu", "Diesel", "Available", "Short", 15, "seed-2"),

    // Denko 73rd — Available across the board
    r("st-denko-73", "92", "Available", "Short", 6),
    r("st-denko-73", "92", "Available", "Short", 14, "seed-2"),
    r("st-denko-73", "95", "Available", "No Queue", 10),
    r("st-denko-73", "Diesel", "Limited", "Medium", 9),

    // Max Bogyoke — Premium diesel available, 95 sold out
    r("st-max-strand", "Premium Diesel", "Available", "No Queue", 4),
    r("st-max-strand", "95", "Sold Out", null, 20),
    r("st-max-strand", "95", "Sold Out", null, 32, "seed-2"),
    r("st-max-strand", "92", "Limited", "Medium", 18),
    r("st-max-strand", "Diesel", "Available", "Medium", 22),

    // ST Oil Yadanabon — fresh reports
    r("st-st-oil-yadanabon", "92", "Available", "Medium", 3),
    r("st-st-oil-yadanabon", "Diesel", "Available", "Long", 7),
    r("st-st-oil-yadanabon", "Premium Diesel", "Available", "Short", 11),

    // MPS 84 — Closed
    r("st-mps-84", "92", "Closed", null, 25),
    r("st-mps-84", "Diesel", "Closed", null, 25, "seed-2"),

    // Denko Airport — Diesel sold out
    r("st-denko-airport", "Diesel", "Sold Out", null, 16),
    r("st-denko-airport", "Diesel", "Sold Out", null, 22, "seed-2"),
    r("st-denko-airport", "92", "Limited", "Long", 14),

    // CNPC 90 — mixed, conflicting on 92
    r("st-cnpc-90", "92", "Available", "Short", 12),
    r("st-cnpc-90", "92", "Sold Out", null, 18, "seed-2"),
    r("st-cnpc-90", "Premium Diesel", "Available", "No Queue", 6),
    r("st-cnpc-90", "Diesel", "Available", "Short", 9),

    // National Mahaaungmyay — outdated data
    r("st-national-mahaaung", "92", "Available", "Medium", 95),
    r("st-national-mahaaung", "Diesel", "Available", "Short", 110),

    // Max Sagaing Bridge — fresh, mostly available
    r("st-max-sagaing-bridge", "92", "Available", "No Queue", 5),
    r("st-max-sagaing-bridge", "95", "Available", "No Queue", 5),
    r("st-max-sagaing-bridge", "Diesel", "Limited", "Short", 13),
    r("st-max-sagaing-bridge", "Premium Diesel", "Available", "Short", 20),
  ];
}

// Approximate Mandalay center for distance ordering fallback.
export const MANDALAY_CENTER = { lat: 21.9755, lng: 96.0836 };
