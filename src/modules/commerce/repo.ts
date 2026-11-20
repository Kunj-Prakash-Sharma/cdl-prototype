// PRIVATE to modules/commerce: database access only. No rules live here (those are in service.ts).
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements } from "./schema";

export type EntitlementRow = typeof entitlements.$inferSelect;

export async function findActive(userId: string, courseSlug: string): Promise<EntitlementRow | undefined> {
  const [row] = await db
    .select()
    .from(entitlements)
    .where(
      and(eq(entitlements.userId, userId), eq(entitlements.courseSlug, courseSlug), isNull(entitlements.revokedAt)),
    );
  return row;
}

/** Inserts an active entitlement unless one exists. The partial unique index decides, so two racing grants make one row. */
export async function insertIfNoActive(row: typeof entitlements.$inferInsert): Promise<void> {
  await db.insert(entitlements).values(row).onConflictDoNothing();
}

export async function revokeActive(userId: string, courseSlug: string, now: Date): Promise<void> {
  await db
    .update(entitlements)
    .set({ revokedAt: now })
    .where(
      and(eq(entitlements.userId, userId), eq(entitlements.courseSlug, courseSlug), isNull(entitlements.revokedAt)),
    );
}

export async function listActive(userId: string): Promise<EntitlementRow[]> {
  return db
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), isNull(entitlements.revokedAt)))
    .orderBy(desc(entitlements.grantedAt), entitlements.courseSlug);
}
