// Proves the Turnstile bot check really blocks OTP sends (D54). Uses Cloudflare's always-fail dummy secret.
// Needs Postgres and network access. Run with: npm run test:int
import { beforeEach, expect, it, vi } from "vitest";

const { sentCodes } = vi.hoisted(() => {
  try {
    process.loadEnvFile();
  } catch {
    // no .env: rely on the real environment
  }
  process.env.TURNSTILE_SECRET_KEY = "2x0000000000000000000000000000000AA"; // always fails validation
  return { sentCodes: [] as string[] };
});

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/integrations/sms", () => ({ sms: { sendOtp: vi.fn(async (_p: string, c: string) => void sentCodes.push(c)) } }));

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendOtp } from "./actions";

beforeEach(async () => {
  sentCodes.length = 0;
  await db.execute(sql`truncate auth_verification, auth_rate_limit, auth_otp_throttle cascade`);
});

it("rejects a failed bot check, sends no SMS and does not burn the number's daily cap", async () => {
  expect(await sendOtp({ phone: "9876543210", captchaToken: "any-token" })).toMatchObject({
    ok: false,
    code: "captcha_failed",
  });
  expect(sentCodes).toHaveLength(0);

  const [row] = await db.execute(sql`select count(*)::int as n from auth_otp_throttle where "sendCount" > 0`).then((r) => r.rows);
  expect(row.n).toBe(0);
});
