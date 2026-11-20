// PRIVATE to modules/auth: database access only.
import { createHmac } from "node:crypto";
import { and, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { escapeLike, type UserFilters } from "./admin-users";
import { applyLock, decideSend, emptyThrottle, type SendDecision, type Throttle } from "./limits";
import { authOtpThrottle, authUser } from "./schema";

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
      .set({ lockedUntil: next.lockedUntil, updatedAt: now })
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

export async function setUserName(userId: string, name: string): Promise<void> {
  await db.update(authUser).set({ name, updatedAt: new Date() }).where(eq(authUser.id, userId));
}

function userWhere(filters: Pick<UserFilters, "q" | "role">): SQL | undefined {
  const role =
    filters.role === "admin"
      ? eq(authUser.role, "admin")
      : filters.role === "learner"
        ? or(isNull(authUser.role), ne(authUser.role, "admin"))
        : undefined;
  const pattern = `%${escapeLike(filters.q)}%`;
  const text = filters.q ? or(ilike(authUser.name, pattern), ilike(authUser.phoneNumber, pattern)) : undefined;
  return and(role, text);
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
    .from(authUser);
  return row ?? { total: 0, admins: 0, named: 0, newThisWeek: 0 };
}
