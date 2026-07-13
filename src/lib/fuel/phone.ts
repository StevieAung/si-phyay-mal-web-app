// Myanmar phone normalization — frontend demo only.
// Never store or log the result to persistent storage.

const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";

function toLatinDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const i = MM_DIGITS.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

export type PhoneParseResult =
  | { ok: true; e164: string; masked: string }
  | { ok: false; error: string };

/** Accept `09...`, `959...`, `+959...` in Latin or Myanmar digits. */
export function normalizeMyanmarPhone(raw: string): PhoneParseResult {
  const cleaned = toLatinDigits(raw).replace(/[\s\-()]/g, "");
  let core: string | null = null;
  if (/^\+959\d{7,9}$/.test(cleaned)) core = cleaned.slice(4);
  else if (/^959\d{7,9}$/.test(cleaned)) core = cleaned.slice(3);
  else if (/^09\d{7,9}$/.test(cleaned)) core = cleaned.slice(2);
  else if (/^\+/.test(cleaned))
    return {
      ok: false,
      error: "မြန်မာနံပါတ်သာလက်ခံပါသည် · Myanmar (+959) numbers only",
    };
  if (!core)
    return {
      ok: false,
      error: "ဖုန်းနံပါတ်မှားနေသည် · Invalid Myanmar mobile number",
    };
  const e164 = `+959${core}`;
  return { ok: true, e164, masked: maskPhone(e164) };
}

export function maskPhone(e164: string): string {
  if (!e164.startsWith("+959") || e164.length < 6) return "•••••";
  const last2 = e164.slice(-2);
  return `+959•••••${last2}`;
}
