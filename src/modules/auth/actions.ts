"use server";

// Server actions for the login screens. Thin: validate, apply limits, call Better Auth, map the result to a
// typed `{ ok, code }` (UI contract in docs/specs/auth.md). Expected failures never throw.
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";
import { analytics } from "@/integrations/analytics";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { auth } from "./auth";
import { mapSendFailure, mapVerifyFailure } from "./errors";
import { LOCK_SEC, OTP_EXPIRES_SEC, OTP_MAX_ATTEMPTS, RESEND_COOLDOWN_SEC } from "./limits";
import { safeNextPath } from "./next-path";
import { normalizePhone } from "./phone";
import { findUserIdByPhone, getUserRole, lockNumber, peekSend, phoneHash, recordVerifyFail, setUserRole } from "./repo";
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

export async function sendOtp(input: unknown): Promise<ActionResult<SendOtpOk>> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, code: "invalid_phone" };

  // Cheap read-only check first: a rejected resend must not replace the code the learner already has.
  const pre = await peekSend(phone, new Date());
  if (!pre.ok) return { ok: false, code: pre.code, retryAfterSec: pre.retryAfterSec };

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

export async function logout(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // already logged out: fine
  }
  return { ok: true };
}
