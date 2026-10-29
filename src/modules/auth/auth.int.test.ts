// Integration test: real Better Auth + real Postgres (docker compose up -d; npm run db:migrate).
// Only the SMS sender and Next's request context (headers/cookies) are faked.
// Run with: npm run test:int
// The captcha check uses Cloudflare's public dummy secret, so it needs network access.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { jar, sentCodes, nextHeaders } = vi.hoisted(() => {
  try {
    process.loadEnvFile();
  } catch {
    // no .env: rely on the real environment
  }
  process.env.ADMIN_PHONES = "9000000001";
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  const jar = new Map<string, string>();
  return {
    jar,
    sentCodes: [] as { phone: string; code: string }[],
    nextHeaders: {
      headers: async () =>
        new Headers({
          cookie: [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; "),
          "x-forwarded-for": "203.0.113.5",
        }),
      cookies: async () => ({
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
        set: (name: string, value: string, opts?: { maxAge?: number }) => {
          if (value === "" || opts?.maxAge === 0) jar.delete(name);
          else jar.set(name, value);
        },
      }),
    },
  };
});

// Better Auth's nextCookies plugin imports "next/headers.js", our code imports "next/headers": mock both.
vi.mock("next/headers", () => nextHeaders);
vi.mock("next/headers.js", () => nextHeaders);
vi.mock("@/integrations/sms", () => ({
  sms: {
    sendOtp: vi.fn(async (phone: string, code: string) => {
      sentCodes.push({ phone, code });
    }),
  },
}));

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logout, sendOtp, verifyOtp } from "./actions";
import { authOtpThrottle } from "./schema";
import { getSession, requireAdmin, requireUser, updateProfileName } from "./service";

const CAPTCHA = "XXXX.DUMMY.TOKEN.XXXX";
const LEARNER = "9876543210";
const lastCode = () => sentCodes.at(-1)!.code;
const wrongCode = () => (lastCode() === "000000" ? "111111" : "000000");

beforeEach(async () => {
  jar.clear();
  sentCodes.length = 0;
  await db.execute(
    sql`truncate auth_user, auth_session, auth_account, auth_verification, auth_rate_limit, auth_otp_throttle cascade`,
  );
});

describe("send", () => {
  it("rejects bad input before touching anything", async () => {
    expect(await sendOtp({ phone: "12345", captchaToken: CAPTCHA })).toEqual({ ok: false, code: "invalid_phone" });
    expect(await sendOtp({ phone: LEARNER, captchaToken: "" })).toEqual({ ok: false, code: "invalid_input" });
    expect(sentCodes).toHaveLength(0);
  });

  it("sends a code, then rejects a fast resend without sending", async () => {
    expect(await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA })).toMatchObject({ ok: true, expiresInSec: 300 });
    expect(sentCodes).toEqual([{ phone: "+919876543210", code: expect.stringMatching(/^\d{6}$/) }]);

    const again = await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    expect(again).toMatchObject({ ok: false, code: "cooldown" });
    expect(sentCodes).toHaveLength(1);
  });

  it("stops at the daily cap", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    await db.update(authOtpThrottle).set({ sendCount: 5, lastSentAt: new Date(Date.now() - 60_000) });
    expect(await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA })).toMatchObject({ ok: false, code: "daily_limit" });
    expect(sentCodes).toHaveLength(1);
  });

  it("does not store the phone number in the throttle table", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    const rows = await db.select().from(authOtpThrottle);
    expect(JSON.stringify(rows)).not.toContain("9876543210");
  });
});

describe("verify and session", () => {
  async function login(phone = LEARNER) {
    await sendOtp({ phone, captchaToken: CAPTCHA });
    return verifyOtp({ phone, code: lastCode(), next: "/discover" });
  }

  it("logs a new learner in, creates a session and reads it back", async () => {
    expect(await login()).toEqual({ ok: true, isNewUser: true, next: "/discover" });
    expect(await getSession()).toMatchObject({ role: "learner", name: "", phoneMasked: "+91******3210" });
  });

  it("never exposes the raw phone in the session view", async () => {
    await login();
    expect(JSON.stringify(await getSession())).not.toContain("9876543210");
  });

  it("recognises a returning learner", async () => {
    await login();
    await logout();
    jar.clear();
    await db.update(authOtpThrottle).set({ lastSentAt: new Date(Date.now() - 60_000) });
    expect(await login()).toMatchObject({ ok: true, isNewUser: false });
  });

  it("replaces an unsafe next path with the default", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    expect(await verifyOtp({ phone: LEARNER, code: lastCode(), next: "https://evil.example" })).toMatchObject({
      ok: true,
      next: "/discover",
    });
  });

  it("gives allow-listed numbers the admin role", async () => {
    await login("9000000001");
    expect(await getSession()).toMatchObject({ role: "admin" });
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });

  it("logout ends the session", async () => {
    await login();
    await logout();
    expect(await getSession()).toBeNull();
  });

  it("saves the name, with bounds", async () => {
    await login();
    const { userId } = (await getSession())!;
    expect(await updateProfileName(userId, "  Asha  ")).toEqual({ ok: true });
    expect((await getSession())!.name).toBe("Asha");
    expect(await updateProfileName(userId, "")).toMatchObject({ ok: false, code: "invalid_input" });
    expect(await updateProfileName(userId, "x".repeat(31))).toMatchObject({ ok: false, code: "invalid_input" });
  });
});

describe("abuse", () => {
  it("reports a wrong code, then locks the number after 5 wrong tries", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    const bad = wrongCode();
    for (let i = 0; i < 4; i++) {
      expect(await verifyOtp({ phone: LEARNER, code: bad })).toMatchObject({ ok: false, code: "bad_code" });
    }
    expect(await verifyOtp({ phone: LEARNER, code: bad })).toMatchObject({ ok: false, code: "locked", retryAfterSec: 900 });

    // locked: even the right code is refused, and no new code can be sent
    expect(await verifyOtp({ phone: LEARNER, code: lastCode() })).toMatchObject({ ok: false, code: "locked" });
    expect(await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA })).toMatchObject({ ok: false, code: "locked" });
    expect(sentCodes).toHaveLength(1);
  });

  it("an expired code asks the learner to resend", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    await db.execute(sql`update auth_verification set \"expiresAt\" = now() - interval '1 minute'`);
    expect(await verifyOtp({ phone: LEARNER, code: lastCode() })).toMatchObject({ ok: false, code: "expired" });
  });

  it("a code for a number that never asked is treated as expired, not as an error", async () => {
    expect(await verifyOtp({ phone: LEARNER, code: "123456" })).toMatchObject({ ok: false, code: "expired" });
  });
});

describe("guards", () => {
  it("requireUser sends a logged-out visitor to /login with a safe next", async () => {
    await expect(requireUser("/discover")).rejects.toMatchObject({
      digest: expect.stringContaining("/login?next=%2Fdiscover"),
    });
    await expect(requireUser("https://evil.example")).rejects.toMatchObject({
      digest: expect.stringMatching(/;\/login;/),
    });
  });

  it("requireAdmin sends a learner home", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    await verifyOtp({ phone: LEARNER, code: lastCode() });
    await expect(requireAdmin("/admin")).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });
  });
});
