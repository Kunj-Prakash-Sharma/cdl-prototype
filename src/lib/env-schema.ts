import { z } from "zod";

/**
 * Pure env schema + parser (no side effects), so it can be unit-tested without real env vars.
 * Provider switches default to `fake` so dev needs no keys.
 */
const provider = (real: string[], fallback = "fake") =>
  z.enum(["fake", ...real] as [string, ...string[]]).default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),

  // Auth (Better Auth + Turnstile bot check). Required in production only (see parseEnv).
  AUTH_SECRET: z.string().min(32).optional(),
  TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

  // Chat: inactivity before a session counts as lost (decision D58)
  CHAT_INACTIVITY_MINUTES: z.coerce.number().int().positive().default(30),

  // Integration adapters (src/integrations). Add vendor names as adapters land.
  SMS_PROVIDER: provider([]),
  PAYMENTS_PROVIDER: provider([]),
  VIDEO_PROVIDER: provider([]),
  STORAGE_PROVIDER: provider([]),
  AI_PROVIDER: provider([]),
  EMAIL_PROVIDER: provider([]),
  ANALYTICS_PROVIDER: provider([]),
  QUEUE_PROVIDER: provider(["pgboss"], "pgboss"),
}).superRefine((env, ctx) => {
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
