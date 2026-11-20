// PRIVATE to modules/auth: database access only.
import { createHmac } from "node:crypto";
import { and, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { escapeLike, type UserFilters } from "./admin-users";
import {
  applyLock,
  decideSend,
  decideWindow,
  emptyThrottle,
  type SendDecision,
  type Throttle,
  type WindowDecision,
} from "./limits";
import { authOtpThrottle, authSession, authUser } from "./schema";

/** HMAC of the number: lets us count per number without keeping the number in this table. */
export function phoneHash(phone: string): string {
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", env.AUTH_SECRET).update(phone).digest("hex");
}

type ThrottleRow = typeof authOtpThrottle.$inferSelect;
const toThrottle = (row: ThrottleRow | undefined): Throttle =>
  row
    ? {
        lastSentAt: row.lastSentAt,
        windowStart: row.windowStart,
        sendCount: row.sendCount,
        lockedUntil: row.lockedUntil,
      }
    : emptyThrottle;

/** Read-only check, used before calling Better Auth. Writes nothing, so it cannot be used to burn a number's cap. */
export async function peekSend(phone: string, now: Date): Promise<SendDecision> {
  const [row] = await db
    .select()
    .from(authOtpThrottle)
    .where(eq(authOtpThrottle.phoneHash, phoneHash(phone)));
  return decideSend(toThrottle(row), now);
}

/** Atomic check-and-record, used inside the OTP send hook (after the bot check has passed). */
export async function reserveSend(phone: string, now: Date): Promise<SendDecision & { sendCount?: number }> {
  const key = phoneHash(phone);
  return db.transaction(async (tx) => {
    await tx.insert(authOtpThrottle).values({ phoneHash: key }).onConflictDoNothing();
    const [row] = await tx.select().from(authOtpThrottle).where(eq(authOtpThrottle.phoneHash, key)).for("update");
    const decision = decideSend(toThrottle(row), now);
    if (!decision.ok) return decision;
    await tx
      .update(authOtpThrottle)
      .set({ ...decision.next, verifyFails: 0, updatedAt: now })
      .where(eq(authOtpThrottle.phoneHash, key));
    return { ...decision, sendCount: decision.next.sendCount };
  });
}

/** Row key of the one shared counter behind the SMS spend cutoff (D74). */
export const SMS_TOTAL_KEY = "sms:total";
/** Row key of one browser's counter: an HMAC of its cookie id, never the id itself. */
export const deviceKey = (deviceId: string) => `dev:${phoneHash(`device:${deviceId}`)}`;

/**
 * Atomic "count one more, unless `cap` is already reached in the rolling day" on any counter row. Used for the device
 * limit and the SMS spend cutoff. Two requests at once cannot both take the last slot (row lock).
 */
export async function reserveWindow(key: string, cap: number, now: Date): Promise<WindowDecision> {
  return db.transaction(async (tx) => {
    await tx.insert(authOtpThrottle).values({ phoneHash: key }).onConflictDoNothing();
    const [row] = await tx.select().from(authOtpThrottle).where(eq(authOtpThrottle.phoneHash, key)).for("update");
    const decision = decideWindow(toThrottle(row), now, cap);
    if (!decision.ok) return decision;
    await tx
      .update(authOtpThrottle)
      .set({ ...decision.next, updatedAt: now })
      .where(eq(authOtpThrottle.phoneHash, key));
    return decision;
  });
}

/** Counts a wrong code and returns the attempt number (1 = first try). */
export async function recordVerifyFail(phone: string): Promise<number> {
  const key = phoneHash(phone);
  await db.insert(authOtpThrottle).values({ phoneHash: key }).onConflictDoNothing();
  const [row] = await db
    .update(authOtpThrottle)
    .set({ verifyFails: sql`${authOtpThrottle.verifyFails} + 1`, updatedAt: new Date() })
    .where(eq(authOtpThrottle.phoneHash, key))
    .returning({ n: authOtpThrottle.verifyFails });
  return row?.n ?? 1;
}

/** A successful login forgets earlier wrong attempts, so typos made months apart never add up to a lock. */
export async function clearVerifyFails(phone: string): Promise<void> {
  await db
    .update(authOtpThrottle)
    .set({ verifyFails: 0, updatedAt: new Date() })
    .where(eq(authOtpThrottle.phoneHash, phoneHash(phone)));
}

export async function verifyFailCount(phone: string): Promise<number> {
  const [row] = await db
    .select({ n: authOtpThrottle.verifyFails })
    .from(authOtpThrottle)
    .where(eq(authOtpThrottle.phoneHash, phoneHash(phone)));
  return row?.n ?? 0;
}

/** Too many wrong codes: lock the number (15 min). */
export async function lockNumber(phone: string, now: Date): Promise<void> {
  const key = phoneHash(phone);
  await db.insert(authOtpThrottle).values({ phoneHash: key }).onConflictDoNothing();
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(authOtpThrottle).where(eq(authOtpThrottle.phoneHash, key)).for("update");
    const next = applyLock(toThrottle(row), now);
    await tx
      .update(authOtpThrottle)
      // The wrong-attempt count starts again with the lock: once it runs out, the next typo must not lock again.
      .set({ lockedUntil: next.lockedUntil, verifyFails: 0, updatedAt: now })
      .where(eq(authOtpThrottle.phoneHash, key));
  });
}

export async function findUserIdByPhone(phone: string): Promise<string | null> {
  const [row] = await db.select({ id: authUser.id }).from(authUser).where(eq(authUser.phoneNumber, phone));
  return row?.id ?? null;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const [row] = await db.select({ role: authUser.role }).from(authUser).where(eq(authUser.id, userId));
  return row?.role ?? null;
}

export async function setUserRole(userId: string, role: "learner" | "admin"): Promise<void> {
  await db.update(authUser).set({ role, updatedAt: new Date() }).where(eq(authUser.id, userId));
}

/** Ends every session of a user (used when an admin password is reset). */
export async function deleteSessionsForUser(userId: string): Promise<void> {
  await db.delete(authSession).where(eq(authSession.userId, userId));
}

/**
 * A guest verified a phone (D80): remember which real user it became, and hand over the name the guest typed in the quiz
 * (the newest name wins). Only a guest can be linked, and never to itself; running it twice changes nothing more.
 */
export async function linkGuest(guestId: string, userId: string): Promise<void> {
  if (guestId === userId) return;
  await db.transaction(async (tx) => {
    const [guest] = await tx
      .select({ name: authUser.name, isAnonymous: authUser.isAnonymous })
      .from(authUser)
      .where(eq(authUser.id, guestId));
    if (!guest?.isAnonymous) return;
    await tx.update(authUser).set({ linkedUserId: userId, updatedAt: new Date() }).where(eq(authUser.id, guestId));
    if (guest.name)
      await tx.update(authUser).set({ name: guest.name, updatedAt: new Date() }).where(eq(authUser.id, userId));
  });
}

export async function setUserName(userId: string, name: string): Promise<void> {
  await db.update(authUser).set({ name, updatedAt: new Date() }).where(eq(authUser.id, userId));
}

// Guests (anonymous users, D80) are not "users" for the admin lists and counts.
const notGuest = sql`coalesce(${authUser.isAnonymous}, false) = false`;

function userWhere(filters: Pick<UserFilters, "q" | "role">): SQL | undefined {
  const role =
    filters.role === "admin"
      ? eq(authUser.role, "admin")
      : filters.role === "learner"
        ? or(isNull(authUser.role), ne(authUser.role, "admin"))
        : undefined;
  const pattern = `%${escapeLike(filters.q)}%`;
  const text = filters.q ? or(ilike(authUser.name, pattern), ilike(authUser.phoneNumber, pattern)) : undefined;
  return and(notGuest, role, text);
}

export type UserListRow = {
  id: string;
  phoneNumber: string | null;
  name: string;
  role: string | null;
  createdAt: Date;
};

/** One page of users, newest first, plus how many match the filters. PII: returns name and the raw phone. */
export async function listUsers(
  filters: Pick<UserFilters, "q" | "role">,
  limit: number,
  offset: number,
): Promise<{ rows: UserListRow[]; total: number }> {
  const where = userWhere(filters);
  const rows = await db
    .select({
      id: authUser.id,
      phoneNumber: authUser.phoneNumber,
      name: authUser.name,
      role: authUser.role,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .where(where)
    .orderBy(desc(authUser.createdAt), desc(authUser.id))
    .limit(limit)
    .offset(offset);
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(authUser)
    .where(where);
  return { rows, total: counted?.total ?? 0 };
}

/** Numbers for the stat cards, over all users (not just the current filter). */
export async function userCounts(
  now: Date,
): Promise<{ total: number; admins: number; named: number; newThisWeek: number }> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      admins: sql<number>`(count(*) filter (where ${authUser.role} = 'admin'))::int`,
      named: sql<number>`(count(*) filter (where ${authUser.name} <> ''))::int`,
      newThisWeek: sql<number>`(count(*) filter (where ${authUser.createdAt} >= ${weekAgo}))::int`,
    })
    .from(authUser)
    .where(notGuest);
  return row ?? { total: 0, admins: 0, named: 0, newThisWeek: 0 };
}

export async function findPhoneByUserId(userId: string): Promise<string | null> {
  const [row] = await db.select({ phone: authUser.phoneNumber }).from(authUser).where(eq(authUser.id, userId));
  return row?.phone ?? null;
}

export async function findNamesByUserIds(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: authUser.id, name: authUser.name })
    .from(authUser)
    .where(inArray(authUser.id, userIds));
  return new Map(rows.map((row) => [row.id, row.name]));
}

/** Guests that became this real user (D80). Other modules re-point their rows from each of these ids to `userId`. */
export async function findLinkedGuestIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(eq(authUser.linkedUserId, userId), eq(authUser.isAnonymous, true)));
  return rows.map((row) => row.id);
}

/** Guests created before `cutoff` (oldest first), with the real user each became (null if it never verified a phone). */
export async function findGuestsCreatedBefore(
  cutoff: Date,
  limit: number,
): Promise<{ id: string; linkedUserId: string | null }[]> {
  return db
    .select({ id: authUser.id, linkedUserId: authUser.linkedUserId })
    .from(authUser)
    .where(and(eq(authUser.isAnonymous, true), sql`${authUser.createdAt} < ${cutoff}`))
    .orderBy(authUser.createdAt)
    .limit(limit);
}

/** Deletes guests only (the `isAnonymous` check is in the query itself, so a wrong id can never remove a real user). */
export async function deleteGuestUsers(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const gone = await db
    .delete(authUser)
    .where(and(inArray(authUser.id, ids), eq(authUser.isAnonymous, true)))
    .returning({ id: authUser.id });
  return gone.length;
}

export async function findWatermarkId(userId: string): Promise<string | null> {
  const [row] = await db.select({ code: authUser.watermarkId }).from(authUser).where(eq(authUser.id, userId));
  return row?.code ?? null;
}

const isUniqueViolation = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
};

/**
 * Saves `code` only if the user has none yet. "set" = saved; "taken" = another user already has that code (try a new
 * one); "unchanged" = the user already had a code (a racing call won) or does not exist.
 */
export async function setWatermarkIdIfEmpty(userId: string, code: string): Promise<"set" | "taken" | "unchanged"> {
  try {
    const updated = await db
      .update(authUser)
      .set({ watermarkId: code })
      .where(and(eq(authUser.id, userId), isNull(authUser.watermarkId)))
      .returning({ id: authUser.id });
    return updated.length > 0 ? "set" : "unchanged";
  } catch (err) {
    if (isUniqueViolation(err)) return "taken";
    throw err;
  }
}

export async function findUserIdByWatermarkId(code: string): Promise<string | null> {
  const [row] = await db.select({ id: authUser.id }).from(authUser).where(eq(authUser.watermarkId, code));
  return row?.id ?? null;
}
