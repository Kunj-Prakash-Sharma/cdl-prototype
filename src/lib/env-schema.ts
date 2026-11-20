import { z } from "zod";

/**
 * Pure env schema + parser (no side effects), so it can be unit-tested without real env vars.
 * Provider switches default to `fake` so dev needs no keys.
 */
const provider = (real: string[], fallback = "fake") =>
  z.enum(["fake", ...real] as [string, ...string[]]).default(fallback);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),

    // Auth (Better Auth + Turnstile bot check). Required in production only (see parseEnv).
    AUTH_SECRET: z.string().min(32).optional(),
    TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    // Comma-separated +91 numbers that get the admin role when they log in (D64 #9)
    ADMIN_PHONES: z.string().optional(),

    // Where the instant "new callback request" email goes (E6-S3). One team address for now (open question #4668).
    // Optional on purpose: the address is not decided yet. Without it the alert job fails loudly and is retried, and the
    // lead is still saved. Make it required in production once the client gives the address.
    CALLBACK_ALERT_EMAIL: z.email().optional(),

    // Most OTP SMS we send in a rolling day, all learners together (D74). Production defaults to 5000; elsewhere it is off.
    SMS_DAILY_CAP: z.coerce.number().int().positive().optional(),

    // Chat: inactivity before a session counts as lost (decision D58)
    CHAT_INACTIVITY_MINUTES: z.coerce.number().int().positive().default(30),

    // Chat: days without an answer before an unfinished attempt can no longer be continued (decision D75)
    CHAT_RESUME_DAYS: z.coerce.number().int().positive().default(30),

    // Where the phone check sits (D78): "before_report" = anyone can take the quiz and the report is behind the phone gate;
    // "before_chat" = login first, as before. One value, so the position can follow the design.
    REPORT_GATE: z.enum(["before_report", "before_chat"]).default("before_report"),

    // Integration adapters (src/integrations). Add vendor names as adapters land.
    SMS_PROVIDER: provider([]),
    PAYMENTS_PROVIDER: provider([]),
    VIDEO_PROVIDER: provider([]),
    // Dev only (ignored in production): which MP4 the fake video adapter plays. Put a file in public/sample/.
    FAKE_VIDEO_SAMPLE_URL: z.string().startsWith("/").optional(),
    STORAGE_PROVIDER: provider([]),
    EMAIL_PROVIDER: provider([]),
    ANALYTICS_PROVIDER: provider([]),
    QUEUE_PROVIDER: provider(["pgboss"], "pgboss"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of ["AUTH_SECRET", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "required in production" });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${problems}\nSee .env.example.`);
  }
  return result.data;
}
