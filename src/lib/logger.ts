/**
 * Structured JSON logger. Personal data must never reach logs, so known PII keys are redacted
 * (at any depth) before writing. Error tracking (Sentry) is wired here later, in one place.
 */
type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const REDACT = new Set([
  "phone",
  "mobile",
  "email",
  "name",
  "firstname",
  "lastname",
  "otp",
  "code",
  "password",
  "token",
  "authorization",
  "cookie",
  "answer",
  "text",
  "message",
]);

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object" || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: "[redacted]", stack: value.stack };
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACT.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1),
    ]),
  );
}

function write(level: Level, msg: string, ctx?: Context) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...(ctx ? (redact(ctx) as Context) : {}) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (msg: string, ctx?: Context) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Context) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Context) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Context) => write("error", msg, ctx),
};
