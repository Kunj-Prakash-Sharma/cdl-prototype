"use server";

// Server actions for the login screens. Thin: validate, apply limits, call Better Auth, map the result to a
// typed `{ ok, code }` (UI contract in docs/specs/auth.md). Expected failures never throw.
import { isAPIError } from "better-auth/api";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { analytics } from "@/integrations/analytics";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { auth } from "./auth";
import { mapSendFailure, mapSignInFailure, mapVerifyFailure } from "./errors";
import {
  ADMIN_LOGIN_MAX_FAILS,
  LOCK_SEC,
  OTP_EXPIRES_SEC,
  OTP_MAX_ATTEMPTS,
  RESEND_COOLDOWN_SEC,
  deviceDailyCap,
} from "./limits";
import { safeNextPath } from "./next-path";
import { normalizePhone } from "./phone";
import {
  deviceKey,
  findUserIdByPhone,
  clearVerifyFails,
  deleteSessionsForUser,
  getUserRole,
  lockNumber,
  peekSend,
  phoneHash,
  recordVerifyFail,
  reserveWindow,
  setUserRole,
} from "./repo";
import { roleForPhone } from "./roles";
import type { ActionResult, SendOtpOk, VerifyOtpOk } from "./types";

const sendSchema = z.object({ phone: z.string().max(32), captchaToken: z.string().min(1).max(4096) });
const verifySchema = z.object({
  phone: z.string().max(32),
  code: z.string().regex(/^\d{6}$/),
  next: z.string().max(512).optional(),
});

// Funnel id for otp_* events: an HMAC prefix of the number, so events link up but never carry the number.
const funnelId = (phone: string) => `otp-${phoneHash(phone).slice(0, 16)}`;

// A random id in an httpOnly cookie marks one browser (D74). Only its HMAC is stored. Anyone can clear it, so this stops
// one person hammering one browser, not a bot: the IP limit, the bot check and the spend cutoff cover that.
const DEVICE_COOKIE = "device_id";
const DEVICE_ID = /^[a-f0-9]{32}$/;

async function deviceIdFor(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing && DEVICE_ID.test(existing)) return existing;
  const fresh = randomBytes(16).toString("hex");
  jar.set(DEVICE_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
  return fresh;
}

export async function sendOtp(input: unknown): Promise<ActionResult<SendOtpOk>> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, code: "invalid_phone" };

  // Cheap read-only check first: a rejected resend must not replace the code the learner already has.
  const pre = await peekSend(phone, new Date());
  if (!pre.ok) return { ok: false, code: pre.code, retryAfterSec: pre.retryAfterSec };

  // One browser may ask for only so many codes a day (D74). Counted before the bot check: the counter belongs to the
  // caller's own cookie, so it cannot be used against anyone else.
  const device = await reserveWindow(deviceKey(await deviceIdFor()), deviceDailyCap(env.NODE_ENV), new Date());
  if (!device.ok) {
    await analytics.track(funnelId(phone), "otp_sent", { result: "failed", attempt: 1 });
    return { ok: false, code: "device_limit", retryAfterSec: device.retryAfterSec };
  }

  // Goes through Better Auth's HTTP handler on purpose: the Turnstile check and the per-IP rate limit run
  // there and are skipped by direct `auth.api.*` calls.
  const h = await headers();
  const response = await auth.handler(
    new Request(`${env.APP_URL}/api/auth/phone-number/send-otp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: env.APP_URL,
        "x-captcha-response": parsed.data.captchaToken,
        // Behind the load balancer this header is always present; the fallback is for local dev only.
        "x-forwarded-for": h.get("x-forwarded-for") ?? "127.0.0.1",
        "user-agent": h.get("user-agent") ?? "",
      },
      body: JSON.stringify({ phoneNumber: phone }),
    }),
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const failure = mapSendFailure(response.status, body, response.headers.get("x-retry-after"));
    if (failure.code === "unknown") logger.error("otp send failed", { status: response.status });
    await analytics.track(funnelId(phone), "otp_sent", { result: "failed", attempt: 1 });
    return { ok: false, ...failure };
  }

  await analytics.track(funnelId(phone), "otp_sent", { result: "ok", attempt: 1 });
  return { ok: true, resendAfterSec: RESEND_COOLDOWN_SEC, expiresInSec: OTP_EXPIRES_SEC };
}

export async function verifyOtp(input: unknown): Promise<ActionResult<VerifyOtpOk>> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, code: "invalid_phone" };

  const pre = await peekSend(phone, new Date());
  if (!pre.ok && pre.code === "locked") return { ok: false, code: "locked", retryAfterSec: pre.retryAfterSec };

  const existingUserId = await findUserIdByPhone(phone);
  try {
    const result = await auth.api.verifyPhoneNumber({
      body: { phoneNumber: phone, code: parsed.data.code },
      headers: await headers(),
    });
    const userId = result.user?.id ?? existingUserId;
    if (userId) {
      // The allow-list is the source of truth for admin, on every login (promotes and demotes).
      const wanted = roleForPhone(phone);
      if ((await getUserRole(userId)) !== wanted) await setUserRole(userId, wanted);
    }
    await analytics.track(funnelId(phone), "otp_verified", { result: "ok", attempt: 1 });
    return { ok: true, isNewUser: existingUserId === null, next: safeNextPath(parsed.data.next) };
  } catch (err) {
    if (!isAPIError(err)) {
      logger.error("otp verify crashed", { error: err });
      return { ok: false, code: "unknown" };
    }
    const failure = mapVerifyFailure(err.body as { code?: string } | undefined);
    let attempt = 1;
    if (failure.code === "bad_code") {
      attempt = await recordVerifyFail(phone);
      if (attempt >= OTP_MAX_ATTEMPTS) {
        await lockNumber(phone, new Date());
        await analytics.track(funnelId(phone), "otp_verified", { result: "failed", attempt });
        return { ok: false, code: "locked", retryAfterSec: LOCK_SEC };
      }
    } else if (failure.code === "locked") {
      await lockNumber(phone, new Date());
      return { ok: false, code: "locked", retryAfterSec: LOCK_SEC };
    }
    await analytics.track(funnelId(phone), "otp_verified", { result: "failed", attempt });
    return { ok: false, ...failure };
  }
}

const adminSignInSchema = z.object({
  email: z.string().max(254),
  password: z.string().min(1).max(128),
  captchaToken: z.string().min(1).max(4096),
  next: z.string().max(512).optional(),
});

// Where an admin lands when `?next=` is missing or unsafe.
const DEFAULT_AFTER_ADMIN_LOGIN = "/admin/callbacks";

/**
 * Admin login with email + password (D77). The same answer for an unknown email and a wrong password; five wrong
 * passwords lock that email for 15 minutes (counted for any email, so "locked" says nothing about who has an account).
 * Goes through Better Auth's HTTP handler like sendOtp, so the Turnstile check and the per-IP limit run.
 */
export async function adminSignIn(input: unknown): Promise<ActionResult<{ next: string }>> {
  const parsed = adminSignInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const email = parsed.data.email.trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { ok: false, code: "invalid_input" };

  // The lock reuses the OTP lock table under its own key (an HMAC, never the email itself).
  const lockId = `admin:${email}`;
  const pre = await peekSend(lockId, new Date());
  if (!pre.ok && pre.code === "locked") return { ok: false, code: "locked", retryAfterSec: pre.retryAfterSec };

  const h = await headers();
  const response = await auth.handler(
    new Request(`${env.APP_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: env.APP_URL,
        "x-captcha-response": parsed.data.captchaToken,
        "x-forwarded-for": h.get("x-forwarded-for") ?? "127.0.0.1",
        "user-agent": h.get("user-agent") ?? "",
      },
      body: JSON.stringify({ email, password: parsed.data.password }),
    }),
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const failure = mapSignInFailure(response.status, body, response.headers.get("x-retry-after"));
    if (failure.code === "bad_credentials") {
      const attempt = await recordVerifyFail(lockId);
      if (attempt >= ADMIN_LOGIN_MAX_FAILS) {
        await lockNumber(lockId, new Date());
        return { ok: false, code: "locked", retryAfterSec: LOCK_SEC };
      }
    }
    if (failure.code === "unknown") logger.error("admin sign-in failed", { status: response.status });
    return { ok: false, ...failure };
  }

  // Only admins may use this door. A password account is only ever made for an admin, so this is a second lock.
  const sessionCookies = parseSetCookieHeader(response.headers.get("set-cookie") ?? "");
  const body = (await response.json().catch(() => null)) as { user?: { id?: string } } | null;
  const userId = body?.user?.id;
  if (!userId || (await getUserRole(userId)) !== "admin") {
    // End the session by user id, straight in the database, so it cannot survive a cookie that does not round-trip.
    if (userId) await deleteSessionsForUser(userId);
    else {
      const cookie = [...sessionCookies].map(([name, attr]) => `${name}=${encodeURIComponent(attr.value)}`).join("; ");
      await auth.api.signOut({ headers: new Headers({ cookie }) }).catch(() => undefined);
    }
    return { ok: false, code: "bad_credentials" };
  }
  await clearVerifyFails(lockId);
  // Calls through auth.handler skip the nextCookies plugin (it only acts on direct auth.api calls), so the session
  // cookie is passed on here, after the admin check, exactly as Better Auth built it.
  const jar = await cookies();
  for (const [name, attr] of sessionCookies) jar.set(name, attr.value, toCookieOptions(attr));
  return { ok: true, next: safeNextPath(parsed.data.next, DEFAULT_AFTER_ADMIN_LOGIN) };
}

const guestSchema = z.object({ captchaToken: z.string().min(1).max(4096) });

/**
 * Makes a GUEST session (D80) when a visitor taps Start on the quiz. Never called on page load. Anyone who already has a
 * session (guest or learner) gets ok and nothing new is made. Goes through Better Auth's HTTP handler like sendOtp, so the
 * Turnstile check and the per-IP limit run, and the cookie is passed on by hand because nextCookies skips handler calls.
 */
export async function startGuestSession(input: unknown): Promise<ActionResult> {
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const h = await headers();
  if (await auth.api.getSession({ headers: h })) return { ok: true };

  const response = await auth.handler(
    new Request(`${env.APP_URL}/api/auth/sign-in/anonymous`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: env.APP_URL,
        "x-captcha-response": parsed.data.captchaToken,
        "x-forwarded-for": h.get("x-forwarded-for") ?? "127.0.0.1",
        "user-agent": h.get("user-agent") ?? "",
      },
      body: "{}",
    }),
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const failure = mapSendFailure(response.status, body, response.headers.get("x-retry-after"));
    if (failure.code === "unknown") logger.error("guest sign-in failed", { status: response.status });
    return { ok: false, ...failure };
  }
  const jar = await cookies();
  for (const [name, attr] of parseSetCookieHeader(response.headers.get("set-cookie") ?? "")) {
    jar.set(name, attr.value, toCookieOptions(attr));
  }
  // Funnel: the session id is the guest's random id (no personal data); the quiz attempt id takes over from here.
  const created = (await response.json().catch(() => null)) as { user?: { id?: string } } | null;
  if (created?.user?.id) await analytics.track(created.user.id, "guest_started", {});
  return { ok: true };
}

export async function logout(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // already logged out: fine
  }
  return { ok: true };
}
