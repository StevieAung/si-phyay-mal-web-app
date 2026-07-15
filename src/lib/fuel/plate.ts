// License plate parsing and စုံ/မ parity — informational only.
// Never hard-code allowed days or block actions based on parity.

const MM_TO_LATIN: Record<string, string> = {
  "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
  "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
};

export type PlateParity = "စုံ" | "မ";

export function normalizePlateDigits(input: string): string {
  let out = "";
  for (const ch of input) out += MM_TO_LATIN[ch] ?? ch;
  return out;
}

export type PlateParseResult =
  | { ok: true; prefix: number; parity: PlateParity; normalized: string }
  | { ok: false; error: string };

/**
 * Extract one or two numeric digits immediately before the first alphabetic
 * segment. Never fall back to another digit block.
 */
export function parsePlate(input: string): PlateParseResult {
  const normalized = normalizePlateDigits(input.trim());
  const m = normalized.match(/^(\d{1,2})[A-Za-z]-?\d+$/);
  if (!m) {
    return {
      ok: false,
      error:
        "ဥပမာ 7W-1234 (သို့မဟုတ်) 73W-15376 ကဲ့သို့ စာလုံးရှေ့ ဂဏန်း ၁-၂ လုံး ရှိရမည် · One or two digits must appear immediately before a letter (e.g. 7W-1234 or 73W-15376).",
    };
  }
  const prefix = parseInt(m[1], 10);
  const parity: PlateParity = prefix % 2 === 0 ? "စုံ" : "မ";
  return { ok: true, prefix, parity, normalized };
}

export const PARITY_POLICY_NOTE =
  "စုံ/မ အလိုက် ဆီဖြည့်ခွင့်စည်းမျဉ်းများသည် ပြောင်းလဲနိုင်ပါသည်။ လက်ရှိ တရားဝင်ထုတ်ပြန်ချက်ကို စစ်ဆေးပါ။";
