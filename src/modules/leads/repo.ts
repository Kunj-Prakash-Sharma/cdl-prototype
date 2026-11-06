// PRIVATE to modules/leads: database access only. No rules live here (those are in service.ts).
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "./schema";

export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;

/**
 * Inserts a lead unless the learner already has a NEW one. The partial unique index decides, so two taps racing
 * cannot both win: the loser gets `undefined` and the caller reads the winner's row.
 */
export async function insertLeadIfNoNew(row: NewLeadRow): Promise<LeadRow | undefined> {
  const [created] = await db.insert(leads).values(row).onConflictDoNothing().returning();
  return created;
}

export async function findNewLead(userId: string): Promise<LeadRow | undefined> {
  const [row] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.status, "new")));
  return row;
}

export type StatusFilter = LeadRow["status"] | "all";
const whereStatus = (status: StatusFilter) => (status === "all" ? undefined : eq(leads.status, status));

/** One page of leads, newest first (ties by id, so pages never overlap), and how many match. */
export async function listLeads(
  status: StatusFilter,
  limit: number,
  offset: number,
): Promise<{ rows: LeadRow[]; total: number }> {
  const rows = await db
    .select()
    .from(leads)
    .where(whereStatus(status))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(limit)
    .offset(offset);
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(leads)
    .where(whereStatus(status));
  return { rows, total: counted?.total ?? 0 };
}

/** How many leads are in each status, over all leads (not just the current filter). */
export async function countByStatus(): Promise<Record<LeadRow["status"], number>> {
  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .groupBy(leads.status);
  const counts = { new: 0, contacted: 0, closed: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

/** Moves a lead to a status and notes the time. Returns the updated row, or undefined if there is no such lead. */
export async function updateStatus(id: string, status: LeadRow["status"], now: Date): Promise<LeadRow | undefined> {
  const [row] = await db.update(leads).set({ status, statusChangedAt: now }).where(eq(leads.id, id)).returning();
  return row;
}

export async function getLead(id: string): Promise<LeadRow | undefined> {
  const [row] = await db.select().from(leads).where(eq(leads.id, id));
  return row;
}

/** Notes that the team email went out. Only the first call counts (a repeat changes nothing). */
export async function markAlerted(id: string, now: Date): Promise<void> {
  await db
    .update(leads)
    .set({ alertedAt: now })
    .where(and(eq(leads.id, id), isNull(leads.alertedAt)));
}
