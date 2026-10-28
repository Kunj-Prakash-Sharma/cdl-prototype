// Better Auth tables (shapes taken from getAuthTables() of the installed version) plus our own throttle table.
// After upgrading better-auth, compare with `getAuthTables(auth.options)` (from "better-auth/db") before migrating.
import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const authUser = pgTable("auth_user", {
  id: text().primaryKey(),
  name: text().notNull(), // PII. Empty until the learner gives their name in the chat
  email: text().notNull().unique(), // PII. Placeholder `<phone>@phone.invalid` unless Better Auth is given a real one
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: now(),
  updatedAt: now(),
  phoneNumber: text().unique(), // PII. E.164, +91 only
  phoneNumberVerified: boolean(),
  role: text(), // learner | admin
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),
  contactEmail: text(), // PII. Optional real email chosen by the learner
});

export const authSession = pgTable(
  "auth_session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: now(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ipAddress: text(), // PII-ish (IP address)
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
  },
  (t) => [index("auth_session_user_idx").on(t.userId)],
);

// Required by Better Auth even though phone login uses no passwords or social providers.
export const authAccount = pgTable(
  "auth_account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: now(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_account_user_idx").on(t.userId)],
);

// Holds OTPs. `identifier` is the phone number while a code is pending (short-lived, deleted on use or expiry).
export const authVerification = pgTable(
  "auth_verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(), // PII while a code is pending
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: now(),
    updatedAt: now(),
  },
  (t) => [index("auth_verification_identifier_idx").on(t.identifier)],
);

// Per-IP rate limiter storage (Better Auth). `key` contains the IP address.
export const authRateLimit = pgTable("auth_rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(), // PII-ish (IP address)
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// Per-number send state (cooldown, daily cap, lock). Keyed by an HMAC of the number, never the number itself.
export const authOtpThrottle = pgTable("auth_otp_throttle", {
  phoneHash: text().primaryKey(),
  lastSentAt: timestamp({ withTimezone: true }),
  windowStart: timestamp({ withTimezone: true }),
  sendCount: integer().notNull().default(0),
  verifyFails: integer().notNull().default(0), // wrong codes since the last send (for the otp_verified attempt number)
  lockedUntil: timestamp({ withTimezone: true }),
  updatedAt: now(),
});
