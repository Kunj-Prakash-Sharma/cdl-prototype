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
import { adminSignIn, logout, sendOtp, verifyOtp } from "./actions";
import { createEmailAdmin, resetEmailAdminPassword } from "./admin-accounts";
import { auth } from "./auth";
import { authAccount, authOtpThrottle, authSession, authUser } from "./schema";
import {
  getSession,
  listUsersForAdmin,
  parseUserFilters,
  requireAdmin,
  requireUser,
  updateProfileName,
} from "./service";

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

  it("stops a browser at its daily device cap, and keeps the counter under a hashed key", async () => {
    // First send creates the cookie and the counter row; fill it to the (test) cap, as the daily-cap test does.
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    const deviceId = jar.get("device_id");
    expect(deviceId).toMatch(/^[a-f0-9]{32}$/);
    await db
      .update(authOtpThrottle)
      .set({ sendCount: 100 })
      .where(sql`${authOtpThrottle.phoneHash} like 'dev:%'`);

    const other = await sendOtp({ phone: "9876543211", captchaToken: CAPTCHA });
    expect(other).toMatchObject({ ok: false, code: "device_limit" });
    expect(sentCodes).toHaveLength(1);
    expect(JSON.stringify(await db.select().from(authOtpThrottle))).not.toContain(deviceId!);

    // Another browser (no cookie) is not affected.
    jar.delete("device_id");
    expect(await sendOtp({ phone: "9876543212", captchaToken: CAPTCHA })).toMatchObject({ ok: true });
  });

  it("ignores a forged device cookie and issues a fresh one", async () => {
    jar.set("device_id", "not-a-valid-id");
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    expect(jar.get("device_id")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("sends no code to anyone once the day's SMS budget is used up, and does not burn the number's count", async () => {
    await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
    await db
      .update(authOtpThrottle)
      .set({ sendCount: 1_000_000 })
      .where(sql`${authOtpThrottle.phoneHash} = 'sms:total'`);
    jar.delete("device_id");

    const blocked = await sendOtp({ phone: "9876543211", captchaToken: CAPTCHA });
    expect(blocked).toMatchObject({ ok: false, code: "sms_cutoff" });
    expect(blocked.ok === false && blocked.retryAfterSec).toBeGreaterThan(0);
    expect(sentCodes).toHaveLength(1);
    // The refused number has no throttle row of its own: nothing was counted against it.
    const rows = await db.select().from(authOtpThrottle);
    expect(rows.filter((r) => !r.phoneHash.startsWith("dev:") && r.phoneHash !== "sms:total")).toHaveLength(1);
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
    expect(await verifyOtp({ phone: LEARNER, code: bad })).toMatchObject({
      ok: false,
      code: "locked",
      retryAfterSec: 900,
    });

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

describe("admin users list", () => {
  async function loginAs(phone: string) {
    jar.clear();
    await sendOtp({ phone, captchaToken: CAPTCHA });
    await verifyOtp({ phone, code: lastCode() });
  }
  const filters = (params: Record<string, string> = {}) => parseUserFilters(params);

  it("sends a logged-out visitor to /login and a learner home, before any query runs", async () => {
    await expect(listUsersForAdmin(filters())).rejects.toMatchObject({
      digest: expect.stringContaining("/login"),
    });
    await loginAs(LEARNER);
    await expect(listUsersForAdmin(filters())).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });
  });

  it("lists users newest first with masked phones and the stat numbers", async () => {
    await loginAs("9876500001");
    await loginAs(LEARNER);
    const { userId } = (await getSession())!;
    await updateProfileName(userId, "Asha");
    await loginAs("9000000001"); // the admin, logged in last

    const view = await listUsersForAdmin(filters());
    expect(view.rows.map((r) => r.phoneMasked)).toEqual(["+91******0001", "+91******3210", "+91******0001"]);
    expect(view.rows[0]).toMatchObject({ role: "admin" });
    expect(view.stats).toEqual({ total: 3, admins: 1, named: 1, newThisWeek: 3 });
    expect(view).toMatchObject({ total: 3, page: 1, pageCount: 1 });
    // the raw numbers never leave the module
    expect(JSON.stringify(view)).not.toMatch(/\+91(987|900)\d{7}/);
    expect(JSON.stringify(view)).not.toContain("phone.invalid");
  });

  it("filters by search text and by role", async () => {
    await loginAs(LEARNER);
    await loginAs("9876500001");
    await loginAs("9000000001");

    expect((await listUsersForAdmin(filters({ q: "3210" }))).rows).toHaveLength(1);
    expect((await listUsersForAdmin(filters({ role: "admin" }))).rows).toHaveLength(1);
    expect((await listUsersForAdmin(filters({ role: "learner" }))).rows).toHaveLength(2);
    expect((await listUsersForAdmin(filters({ q: "9999999" }))).rows).toHaveLength(0);
  });

  it("treats LIKE wildcards in the search text as plain characters", async () => {
    await loginAs(LEARNER);
    await loginAs("9000000001");
    expect((await listUsersForAdmin(filters({ q: "%" }))).rows).toHaveLength(0);
    expect((await listUsersForAdmin(filters({ q: "_" }))).rows).toHaveLength(0);
  });

  it("pages the list", async () => {
    await loginAs("9000000001");
    const base = new Date("2026-01-01T00:00:00Z");
    await db.insert(authUser).values(
      Array.from({ length: 24 }, (_, i) => ({
        id: `seed-${i}`,
        name: "",
        email: `seed-${i}@phone.invalid`,
        phoneNumber: `+9170000${String(i).padStart(5, "0")}`,
        role: "learner",
        createdAt: new Date(base.getTime() + i * 1000),
      })),
    );

    const first = await listUsersForAdmin(filters());
    expect(first).toMatchObject({ total: 25, page: 1, pageCount: 2 });
    expect(first.rows).toHaveLength(20);
    expect(first.rows[0]).toMatchObject({ role: "admin" }); // newest

    const second = await listUsersForAdmin(filters({ page: "2" }));
    expect(second.rows).toHaveLength(5);
    expect((await listUsersForAdmin(filters({ page: "99" }))).rows).toHaveLength(0);
  });
});

describe("admin login with email + password (D77)", () => {
  const EMAIL = "team@client.com";
  const CAPTCHA_OK = { captchaToken: CAPTCHA };
  const signIn = (email: string, password: string, next?: string) =>
    adminSignIn({ email, password, next, ...CAPTCHA_OK });
  const must = async (email = EMAIL) => {
    const made = await createEmailAdmin(email);
    if (!made.ok) throw new Error(made.code);
    return made.password;
  };
  const sessionsFor = (email: string) =>
    db
      .select({ id: authSession.id })
      .from(authSession)
      .innerJoin(authUser, sql`${authUser.id} = ${authSession.userId}`)
      .where(sql`${authUser.email} = ${email}`);

  describe("making and resetting the accounts", () => {
    it("creates an admin with a random password that is stored only as a hash", async () => {
      const made = await createEmailAdmin("  Team@Client.COM ");
      expect(made).toMatchObject({ ok: true, email: EMAIL });
      const password = made.ok ? made.password : "";
      expect(password).toMatch(/^[A-Za-z0-9_-]{24}$/);

      const [user] = await db
        .select()
        .from(authUser)
        .where(sql`${authUser.email} = ${EMAIL}`);
      expect(user).toMatchObject({ role: "admin", name: "team", emailVerified: true, phoneNumber: null });
      const accounts = await db
        .select()
        .from(authAccount)
        .where(sql`${authAccount.userId} = ${user!.id}`);
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({ providerId: "credential", accountId: user!.id });
      expect(accounts[0]!.password).toBeTruthy();
      expect(accounts[0]!.password).not.toContain(password);
    });

    it("refuses a bad address, a phone placeholder address and an email that already has an account", async () => {
      expect(await createEmailAdmin("nope")).toEqual({ ok: false, code: "invalid_email" });
      expect(await createEmailAdmin("919876543210@phone.invalid")).toEqual({ ok: false, code: "invalid_email" });
      await must();
      expect(await createEmailAdmin("TEAM@client.com")).toEqual({ ok: false, code: "exists" });
      // A phone learner's placeholder email is some other address, but a real learner email is still "exists".
      await sendOtp({ phone: LEARNER, captchaToken: CAPTCHA });
      await verifyOtp({ phone: LEARNER, code: lastCode() });
      const [learner] = await db
        .select()
        .from(authUser)
        .where(sql`${authUser.phoneNumber} = '+919876543210'`);
      await db
        .update(authUser)
        .set({ email: "real@client.com" })
        .where(sql`${authUser.id} = ${learner!.id}`);
      expect(await createEmailAdmin("real@client.com")).toEqual({ ok: false, code: "exists" });
    });

    it("resets with a new password: the old one stops working and every session ends", async () => {
      const oldPassword = await must();
      expect(await signIn(EMAIL, oldPassword)).toMatchObject({ ok: true });
      expect(await sessionsFor(EMAIL)).toHaveLength(1);

      const reset = await resetEmailAdminPassword(EMAIL);
      expect(reset.ok).toBe(true);
      const newPassword = reset.ok ? reset.password : "";
      expect(newPassword).not.toBe(oldPassword);
      expect(await sessionsFor(EMAIL)).toHaveLength(0);

      jar.clear();
      expect(await signIn(EMAIL, oldPassword)).toEqual({ ok: false, code: "bad_credentials" });
      expect(await signIn(EMAIL, newPassword)).toMatchObject({ ok: true });
    });

    it("resets only an existing email admin", async () => {
      expect(await resetEmailAdminPassword(EMAIL)).toEqual({ ok: false, code: "not_found" });
      // A phone admin has no password account, so there is nothing to reset.
      await sendOtp({ phone: "9000000001", captchaToken: CAPTCHA });
      await verifyOtp({ phone: "9000000001", code: lastCode() });
      const [phoneAdmin] = await db
        .select()
        .from(authUser)
        .where(sql`${authUser.phoneNumber} = '+919000000001'`);
      await db
        .update(authUser)
        .set({ email: "phone-admin@client.com" })
        .where(sql`${authUser.id} = ${phoneAdmin!.id}`);
      expect(await resetEmailAdminPassword("phone-admin@client.com")).toEqual({ ok: false, code: "not_found" });
      expect(await resetEmailAdminPassword("bad")).toEqual({ ok: false, code: "invalid_email" });
    });
  });

  describe("signing in", () => {
    it("logs the admin in: a real session, the admin role, and the callbacks page by default", async () => {
      const password = await must();
      expect(await signIn(EMAIL, password)).toEqual({ ok: true, next: "/admin/callbacks" });
      expect(await getSession()).toMatchObject({ role: "admin", name: "team" });
      await expect(requireAdmin("/admin")).resolves.toMatchObject({ role: "admin" });
    });

    it("ignores the case of the email", async () => {
      const password = await must();
      expect(await signIn("  TEAM@Client.com ", password)).toMatchObject({ ok: true });
    });

    it("honours a safe next and ignores an unsafe one", async () => {
      const password = await must();
      expect(await signIn(EMAIL, password, "/admin/users?page=2")).toEqual({ ok: true, next: "/admin/users?page=2" });
      jar.clear();
      expect(await signIn(EMAIL, password, "https://evil.example")).toEqual({ ok: true, next: "/admin/callbacks" });
      jar.clear();
      expect(await signIn(EMAIL, password, "/admin/login")).toEqual({ ok: true, next: "/admin/callbacks" });
    });

    it("gives an unknown email and a wrong password exactly the same answer", async () => {
      const password = await must();
      const wrong = await signIn(EMAIL, `${password}x`);
      const unknown = await signIn("nobody@client.com", password);
      expect(wrong).toEqual({ ok: false, code: "bad_credentials" });
      expect(unknown).toEqual(wrong);
      expect(await getSession()).toBeNull();
    });

    it("rejects bad input before touching anything", async () => {
      expect(await signIn("not-an-email", "x")).toEqual({ ok: false, code: "invalid_input" });
      expect(await signIn(EMAIL, "")).toEqual({ ok: false, code: "invalid_input" });
      expect(await adminSignIn({ email: EMAIL, password: "x", captchaToken: "" })).toEqual({
        ok: false,
        code: "invalid_input",
      });
      expect(await db.select().from(authOtpThrottle)).toHaveLength(0);
    });

    it("locks the email after 5 wrong passwords, even for the right one, and the same for an unknown email", async () => {
      const password = await must();
      for (let i = 1; i <= 4; i++) {
        expect(await signIn(EMAIL, `wrong-${i}`)).toEqual({ ok: false, code: "bad_credentials" });
      }
      expect(await signIn(EMAIL, "wrong-5")).toMatchObject({ ok: false, code: "locked", retryAfterSec: 900 });
      expect(await signIn(EMAIL, password)).toMatchObject({ ok: false, code: "locked" });
      expect(await getSession()).toBeNull();

      // "locked" must not reveal which emails have accounts: an unknown email locks the same way.
      for (let i = 1; i <= 4; i++) await signIn("nobody@client.com", `wrong-${i}`);
      expect(await signIn("nobody@client.com", "wrong-5")).toMatchObject({ ok: false, code: "locked" });
    });

    it("gives a fresh 5 tries once a lock has run out (one typo does not lock again)", async () => {
      const password = await must();
      for (let i = 1; i <= 5; i++) await signIn(EMAIL, `wrong-${i}`);
      expect(await signIn(EMAIL, password)).toMatchObject({ code: "locked" });

      await db.update(authOtpThrottle).set({ lockedUntil: new Date(Date.now() - 1000) }); // the 15 minutes passed
      expect(await signIn(EMAIL, "typo")).toEqual({ ok: false, code: "bad_credentials" });
      expect(await signIn(EMAIL, password)).toMatchObject({ ok: true });
    });

    it("forgets earlier typos after a successful login", async () => {
      const password = await must();
      for (let i = 1; i <= 4; i++) await signIn(EMAIL, `wrong-${i}`);
      expect(await signIn(EMAIL, password)).toMatchObject({ ok: true });
      jar.clear();
      for (let i = 1; i <= 4; i++) {
        expect(await signIn(EMAIL, `again-${i}`)).toEqual({ ok: false, code: "bad_credentials" });
      }
      expect(await signIn(EMAIL, "again-5")).toMatchObject({ code: "locked" });
    });

    it("does not let the lock of one email affect another admin", async () => {
      const password = await must();
      const other = await must("second@client.com");
      for (let i = 1; i <= 5; i++) await signIn(EMAIL, `wrong-${i}`);
      expect(await signIn(EMAIL, password)).toMatchObject({ code: "locked" });
      expect(await signIn("second@client.com", other)).toMatchObject({ ok: true });
    });

    it("keeps the email out of the lock table (only an HMAC key)", async () => {
      await signIn(EMAIL, "wrong");
      const rows = await db.select().from(authOtpThrottle);
      expect(rows).toHaveLength(1);
      expect(JSON.stringify(rows)).not.toContain("team@client.com");
    });

    it("refuses a password account that is not an admin, and leaves no session behind", async () => {
      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.createUser(
        { email: "learner-pw@client.com", name: "L" },
        { method: "admin" },
      );
      await ctx.internalAdapter.linkAccount({
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: await ctx.password.hash("learner-password-123"),
      });
      expect(await signIn("learner-pw@client.com", "learner-password-123")).toEqual({
        ok: false,
        code: "bad_credentials",
      });
      expect(await sessionsFor("learner-pw@client.com")).toHaveLength(0);
      expect(await getSession()).toBeNull();
    });

    it("cannot be used to register: there is no sign-up", async () => {
      const response = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ email: "self@client.com", password: "a-long-password-123", name: "Me" }),
        }),
      );
      expect(response.ok).toBe(false);
      expect(
        await db
          .select()
          .from(authUser)
          .where(sql`${authUser.email} = 'self@client.com'`),
      ).toHaveLength(0);
    });
  });

  describe("the guard", () => {
    it("sends a logged-out visitor to the admin login page with a safe next", async () => {
      await expect(requireAdmin("/admin/users")).rejects.toMatchObject({
        digest: expect.stringContaining("/admin/login?next=%2Fadmin%2Fusers"),
      });
      await expect(requireAdmin("https://evil.example")).rejects.toMatchObject({
        digest: expect.stringMatching(/;\/admin\/login;/),
      });
    });
  });
});
