// PRIVATE to modules/auth. The only file that configures Better Auth. Other modules use service.ts.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, captcha, phoneNumber } from "better-auth/plugins";
import { sms } from "@/integrations/sms";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { IP_HOURLY_CAP, OTP_EXPIRES_SEC, OTP_LENGTH, OTP_MAX_ATTEMPTS, SESSION_SEC } from "./limits";
import { SEND_FAILED, THROTTLED } from "./errors";
import { normalizePhone } from "./phone";
import { reserveSend } from "./repo";
import { roleForPhone } from "./roles";
import { authAccount, authRateLimit, authSession, authUser, authVerification } from "./schema";

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
      rateLimit: authRateLimit,
    },
  }),

  session: { expiresIn: SESSION_SEC, updateAge: 24 * 60 * 60 },

  user: {
    additionalFields: {
      // PII: optional real email. The built-in `email` column holds a placeholder (see getTempEmail).
      contactEmail: { type: "string", required: false, input: false },
    },
  },

  // Rate limits are per IP + path. Per-number rules (cooldown, daily cap, lock) live in repo.ts/limits.ts.
  rateLimit: {
    enabled: true, // off by default in development
    storage: "database",
    customRules: {
      // Real cap in production; loose in dev/test so repeated manual and Playwright logins from one IP still work.
      "/phone-number/send-otp": { window: 60 * 60, max: env.NODE_ENV === "production" ? IP_HOURLY_CAP : 100 },
      "/phone-number/verify": { window: 60, max: 20 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Allow-listed numbers become admins at sign-up; verifyOtp re-syncs the role on every login.
        before: async (user) => {
          const phone = (user as { phoneNumber?: string }).phoneNumber;
          return { data: { ...user, role: roleForPhone(phone) } };
        },
      },
    },
  },

  plugins: [
    phoneNumber({
      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_SEC,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      // +91 only (D64 #1). actions.ts normalises first, so a valid number always equals its normal form.
      phoneNumberValidator: (phone) => normalizePhone(phone) === phone,
      // Runs after the bot check. Records the send against the per-number limits, then delivers the code.
      // Awaited on purpose: if the SMS provider fails, the learner sees `send_failed` (D64).
      sendOTP: async ({ phoneNumber: phone, code }) => {
        const reserved = await reserveSend(phone, new Date());
        if (!reserved.ok) {
          throw APIError.from("TOO_MANY_REQUESTS", {
            code: THROTTLED,
            message: `${reserved.code}:${reserved.retryAfterSec}`,
          });
        }
        try {
          await sms.sendOtp(phone, code);
        } catch (err) {
          logger.error("sms send failed", { error: err }); // no phone number in the log
          throw APIError.from("INTERNAL_SERVER_ERROR", { code: SEND_FAILED, message: "send_failed" });
        }
      },
      signUpOnVerification: {
        // PII: placeholder only; `.invalid` is a reserved domain, so nothing is ever delivered.
        getTempEmail: (phone) => `${phone.replace("+", "")}@phone.invalid`,
        getTempName: () => "", // the name is collected in the chat (profile), not at login
      },
    }),
    admin({ defaultRole: "learner", adminRoles: ["admin"] }),
    // Bot check on OTP send only. The default endpoint list (sign-up/sign-in/password reset) does not cover it.
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: env.TURNSTILE_SECRET_KEY ?? "",
      endpoints: ["/phone-number/send-otp"],
    }),
    nextCookies(), // must be last: lets server actions set the session cookie
  ],
});

export type Auth = typeof auth;
