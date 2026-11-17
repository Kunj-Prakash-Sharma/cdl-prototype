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

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendOtp, startGuestSession, verifyOtp } from "./actions";
import { authUser } from "./schema";
import {
  deleteGuests,
  expiredGuests,
  getSession,
  getVisitor,
  linkedGuestIds,
  listUsersForAdmin,
  parseUserFilters,
  requireUser,
  updateProfileName,
} from "./service";

// Guests (anonymous users, D80). Real Better Auth + real Postgres; only SMS and Next's cookies are faked.
const CAPTCHA = "XXXX.DUMMY.TOKEN.XXXX";
const PHONE = "9876543210";
const lastCode = () => sentCodes.at(-1)!.code;

beforeEach(async () => {
  jar.clear();
  sentCodes.length = 0;
  await db.execute(
    sql`truncate auth_user, auth_session, auth_account, auth_verification, auth_rate_limit, auth_otp_throttle cascade`,
  );
});

async function guestId(): Promise<string> {
  expect(await startGuestSession({ captchaToken: CAPTCHA })).toEqual({ ok: true });
  const visitor = await getVisitor();
  expect(visitor?.isGuest).toBe(true);
  return visitor!.userId;
}

async function verifyAs(phone: string) {
  expect((await sendOtp({ phone, captchaToken: CAPTCHA })).ok).toBe(true);
  return verifyOtp({ phone, code: lastCode() });
}

describe("guest session", () => {
  it("is a visitor, but not a logged-in learner anywhere else", async () => {
    await guestId();
    expect(await getSession()).toBeNull();
    expect((await getVisitor())?.name).toBe(""); // no name yet, so the quiz still asks for it
    // requireUser sends a guest to /login, exactly like nobody (so buying, callbacks and video stay closed)
    await expect(requireUser("/discover")).rejects.toThrow();
  });

  it("is made once: a second Start tap reuses the same guest", async () => {
    const first = await guestId();
    expect(await startGuestSession({ captchaToken: CAPTCHA })).toEqual({ ok: true });
    expect((await getVisitor())?.userId).toBe(first);
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from auth_user`)).rows as { n: number }[];
    expect(n).toBe(1);
  });

  it("needs the bot check token", async () => {
    expect(await startGuestSession({ captchaToken: "" })).toEqual({ ok: false, code: "invalid_input" });
    expect(await getVisitor()).toBeNull();
  });

  it("does not make a second guest for a logged-in learner", async () => {
    await verifyAs(PHONE);
    expect(await startGuestSession({ captchaToken: CAPTCHA })).toEqual({ ok: true });
    expect((await getVisitor())?.isGuest).toBe(false);
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from auth_user`)).rows as { n: number }[];
    expect(n).toBe(1);
  });
});

describe("linking a guest to a phone", () => {
  it("records the link, keeps the guest row and hands over the typed name", async () => {
    const guest = await guestId();
    expect(await updateProfileName(guest, "Asha")).toEqual({ ok: true });
    expect((await verifyAs(PHONE)).ok).toBe(true);

    const learner = await getSession();
    expect(learner?.name).toBe("Asha");
    expect(learner?.userId).not.toBe(guest);
    expect(await linkedGuestIds(learner!.userId)).toEqual([guest]);
    const [row] = await db.select().from(authUser).where(eq(authUser.id, guest));
    expect(row?.isAnonymous).toBe(true); // not deleted: the chat re-points its rows first, the worker deletes later
  });

  it("links to an existing learner who verifies from a guest session", async () => {
    await verifyAs(PHONE);
    const existing = (await getSession())!.userId;
    jar.clear();
    await db.execute(sql`truncate auth_otp_throttle`); // the 30 second resend wait is not what this test is about
    const guest = await guestId();
    await verifyAs(PHONE);
    expect((await getSession())!.userId).toBe(existing);
    expect(await linkedGuestIds(existing)).toEqual([guest]);
  });

  it("does not link anyone when a learner with no guest logs in", async () => {
    await verifyAs(PHONE);
    expect(await linkedGuestIds((await getSession())!.userId)).toEqual([]);
  });
});

describe("clean-up and admin lists", () => {
  it("hides guests from the admin lists and counts", async () => {
    await guestId();
    jar.clear();
    await guestId();
    jar.clear();
    await verifyAs("9000000001"); // ADMIN_PHONES in this test file
    const view = await listUsersForAdmin(parseUserFilters({}));
    expect(view.total).toBe(1);
    expect(view.stats.total).toBe(1);
    expect(view.rows).toHaveLength(1);
  });

  it("finds only guests older than 7 days and deletes only guests", async () => {
    const oldGuest = await guestId();
    jar.clear();
    const newGuest = await guestId();
    jar.clear();
    await verifyAs(PHONE);
    const learner = (await getSession())!.userId;
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db.update(authUser).set({ createdAt: old }).where(eq(authUser.id, oldGuest));
    await db.update(authUser).set({ createdAt: old }).where(eq(authUser.id, learner)); // an old REAL user must stay

    const expired = await expiredGuests(new Date());
    expect(expired).toEqual([{ id: oldGuest, linkedUserId: null }]);
    expect(await deleteGuests([oldGuest, learner])).toBe(1);
    const left = (await db.select({ id: authUser.id }).from(authUser)).map((r) => r.id);
    expect(left).toContain(learner);
    expect(left).toContain(newGuest);
    expect(left).not.toContain(oldGuest);
  });
});
