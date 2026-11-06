// PURE helpers for the callback download. No database, no clock. The file is opened in Excel by the team, so two
// Excel habits are handled: a cell that starts with = + - @ (or a tab or return) can run as a formula, and a long
// number such as a phone is shown as 9.19877E+11. Names are typed by learners, so they are treated as untrusted.

const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell: a cell that could run as a formula gets a leading single quote, then quotes are added where needed. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** UTF-8 byte order mark: without it Excel reads Hindi and other Indian-script names as garbage. */
const BOM = String.fromCharCode(0xfeff);

export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}

/**
 * Phone for the spreadsheet: starts with a digit and has spaces ("91 98765 43210"), so Excel keeps it as text it will not
 * shorten, and nothing starts with "+". Anything that is not +91 and ten digits is returned unchanged.
 */
export function phoneForSheet(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `91 ${match[1]} ${match[2]}` : e164;
}

/** Phone for the screen: "+91 98765 43210". */
export function phoneForScreen(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

/** "2026-11-05 15:30" in Indian time, which Excel reads as a date and which sorts as text too. */
export function dateTimeIst(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function dateIst(date: Date): string {
  return dateTimeIst(date).slice(0, 10);
}
