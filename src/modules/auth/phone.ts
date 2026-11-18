const INDIA_MOBILE = /^[6-9]\d{9}$/;

/**
 * Normalises an Indian mobile number to E.164 (`+91XXXXXXXXXX`), or returns null (D64 #1: +91 only).
 * Accepts spaces, dashes, brackets and the common prefixes: +91, 0091, 91, 0.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.trim().replace(/[\s\-().]/g, "");
  let national = digits;
  if (digits.startsWith("+91")) national = digits.slice(3);
  else if (digits.startsWith("0091")) national = digits.slice(4);
  else if (digits.startsWith("91") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  return INDIA_MOBILE.test(national) ? `+91${national}` : null;
}

/** For the UI and logs-safe display only: `+91******6789`. */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)}${"*".repeat(Math.max(e164.length - 7, 0))}${e164.slice(-4)}`;
}

/** Comma-separated env list to a set of normalised numbers; invalid entries are dropped. */
export function parsePhoneList(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const n = normalizePhone(part);
    if (n) out.add(n);
  }
  return out;
}

/**
 * For the phone input as the learner types or pastes: the 10-digit national part, dropping a pasted +91, 0091, 91 or
 * 0 prefix and any spaces or symbols. Never longer than 10 digits.
 */
export function nationalDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  // Strip a prefix only when the length says it is one, so typing past 10 digits never shifts the number.
  if (d.length === 14 && d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
