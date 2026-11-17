// PRIVATE to modules/chat: database access only. No rules live here (those are in service.ts and flow.ts).
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatAnswers, chatAttempts, chatResults } from "./schema";

export type AttemptRow = typeof chatAttempts.$inferSelect;
export type ResultRow = typeof chatResults.$inferSelect;
export type NewResultRow = typeof chatResults.$inferInsert;
type AttemptStatus = AttemptRow["status"];

export async function getAttempt(id: string): Promise<AttemptRow | undefined> {
  const [row] = await db.select().from(chatAttempts).where(eq(chatAttempts.id, id));
  return row;
}

export async function findOpenAttempt(userId: string): Promise<AttemptRow | undefined> {
  const [row] = await db
    .select()
    .from(chatAttempts)
    .where(and(eq(chatAttempts.userId, userId), eq(chatAttempts.status, "in_progress")));
  return row;
}

/**
 * Creates an attempt unless the learner already has an open one. The partial unique index decides, so two tabs
 * racing cannot both win: the loser gets `undefined` and the caller reads the winner's attempt.
 */
export async function createAttemptIfNone(userId: string, setVersion: string): Promise<AttemptRow | undefined> {
  const [row] = await db.insert(chatAttempts).values({ userId, setVersion }).onConflictDoNothing().returning();
  return row;
}

/** Saved answers as `questionId -> value`. */
export async function listAnswers(attemptId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ questionId: chatAnswers.questionId, value: chatAnswers.value })
    .from(chatAnswers)
    .where(eq(chatAnswers.attemptId, attemptId));
  return Object.fromEntries(rows.map((row) => [row.questionId, row.value]));
}

/** Saves one answer (a second tap overwrites it) and notes the time on the attempt, in one transaction. */
export async function saveAnswer(
  answer: { attemptId: string; questionId: string; variantId: string | null; value: number },
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(chatAnswers)
      .values({ ...answer, answeredAt: now })
      .onConflictDoUpdate({
        target: [chatAnswers.attemptId, chatAnswers.questionId],
        set: { variantId: answer.variantId, value: answer.value, answeredAt: now },
      });
    await tx.update(chatAttempts).set({ lastAnswerAt: now }).where(eq(chatAttempts.id, answer.attemptId));
  });
}

export async function deleteAnswers(attemptId: string, questionIds: string[]): Promise<void> {
  if (questionIds.length === 0) return;
  await db
    .delete(chatAnswers)
    .where(and(eq(chatAnswers.attemptId, attemptId), inArray(chatAnswers.questionId, questionIds)));
}

/**
 * Stores the result and marks the attempt completed in ONE transaction: a crash between the two leaves the attempt
 * untouched (still in progress), never a completed attempt without a result. Returns false when the attempt was
 * no longer in progress (finished by another tab), so the caller can read the stored result instead.
 */
export async function completeAttempt(attemptId: string, result: NewResultRow, now: Date): Promise<boolean> {
  return db.transaction(async (tx) => {
    const closed = await tx
      .update(chatAttempts)
      .set({ status: "completed", completedAt: now })
      .where(and(eq(chatAttempts.id, attemptId), eq(chatAttempts.status, "in_progress")))
      .returning({ id: chatAttempts.id });
    if (closed.length === 0) return false;
    await tx.insert(chatResults).values(result);
    return true;
  });
}

export async function setAttemptStatus(attemptId: string, from: AttemptStatus, to: AttemptStatus): Promise<boolean> {
  const changed = await db
    .update(chatAttempts)
    .set({ status: to })
    .where(and(eq(chatAttempts.id, attemptId), eq(chatAttempts.status, from)))
    .returning({ id: chatAttempts.id });
  return changed.length > 0;
}

export async function getResult(attemptId: string): Promise<ResultRow | undefined> {
  const [row] = await db.select().from(chatResults).where(eq(chatResults.attemptId, attemptId));
  return row;
}

/** The newest completed attempt of a learner with its result. */
export async function latestCompleted(userId: string): Promise<{ attempt: AttemptRow; result: ResultRow } | undefined> {
  const [row] = await db
    .select({ attempt: chatAttempts, result: chatResults })
    .from(chatAttempts)
    .innerJoin(chatResults, eq(chatResults.attemptId, chatAttempts.id))
    .where(and(eq(chatAttempts.userId, userId), eq(chatAttempts.status, "completed")))
    .orderBy(desc(chatAttempts.completedAt))
    .limit(1);
  return row;
}

/**
 * Moves every attempt of a guest to the real user it became (D80): the same rows, so answers, results and the attempt id
 * (the analytics session) carry over. One transaction, and a lock per user so two requests cannot claim at once.
 * Idempotent: a second run finds nothing to move. The database allows ONE open attempt per user, so when both have one,
 * the older is abandoned first (the newest quiz wins). Returns how many attempts moved.
 */
export async function claimGuestAttempts(guestId: string, userId: string): Promise<number> {
  if (guestId === userId) return 0;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const mine = await tx
      .select()
      .from(chatAttempts)
      .where(and(eq(chatAttempts.userId, guestId)));
    if (mine.length === 0) return 0;
    const open = mine.find((a) => a.status === "in_progress");
    if (open) {
      const [theirs] = await tx
        .select()
        .from(chatAttempts)
        .where(and(eq(chatAttempts.userId, userId), eq(chatAttempts.status, "in_progress")));
      if (theirs) {
        const stamp = (a: AttemptRow) => (a.lastAnswerAt ?? a.startedAt).getTime();
        const loser = stamp(open) >= stamp(theirs) ? theirs : open;
        await tx.update(chatAttempts).set({ status: "abandoned" }).where(eq(chatAttempts.id, loser.id));
      }
    }
    const moved = await tx
      .update(chatAttempts)
      .set({ userId })
      .where(eq(chatAttempts.userId, guestId))
      .returning({ id: chatAttempts.id });
    return moved.length;
  });
}
