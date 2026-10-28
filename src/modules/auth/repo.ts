// PRIVATE to modules/auth: database access only.
import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
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
    ? { lastSentAt: row.lastSentAt, windowStart: row.windowStart, sendCount: row.sendCount, lockedUntil: row.lockedUntil }
    : emptyThrottle;

/** Read-only check, used before calling Better Auth. Writes nothing, so it cannot be used to burn a number's cap. */
export async function peekSend(phone: string, now: Date): Promise<SendDecision> {
  const [row] = await db.select().from(authOtpThrottle).where(eq(authOtpThrottle.phoneHash, phoneHash(phone)));
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
    await tx.update(authOtpThrottle).set({ lockedUntil: next.lockedUntil, updatedAt: now }).where(eq(authOtpThrottle.phoneHash, key));
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
