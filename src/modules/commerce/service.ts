// PUBLIC interface of modules/commerce. Other modules import only this file.
// Entitlements only (what a learner may access). Orders and payments come with the checkout spec (D17).
// This module does NOT import catalog: the admin action checks the course slug against the course list first.
import type { ActionResult } from "@/lib/action-result";
import { findActive, insertIfNoActive, listActive, revokeActive } from "./repo";

export type CommerceErrorCode = "invalid_input";
export type CommerceResult = ActionResult<object, CommerceErrorCode>;
export type AccessRow = { courseSlug: string; source: "manual" | "purchase"; grantedAt: string };

/** True when the learner has an active (not revoked) entitlement for the course. */
export async function hasAccess(userId: string, courseSlug: string): Promise<boolean> {
  if (!userId || !courseSlug) return false;
  return (await findActive(userId, courseSlug)) !== undefined;
}

/** Gives manual access. Idempotent: granting twice keeps one active row. `grantedBy` is the admin's user id. */
export async function grantAccess(input: {
  userId: string;
  courseSlug: string;
  grantedBy: string;
}): Promise<CommerceResult> {
  if (!input.userId || !input.courseSlug || !input.grantedBy) return { ok: false, code: "invalid_input" };
  try {
    await insertIfNoActive({
      userId: input.userId,
      courseSlug: input.courseSlug,
      source: "manual",
      grantedBy: input.grantedBy,
    });
  } catch (err) {
    // 23503 = foreign key violation: no such user
    const e = err as { code?: string; cause?: { code?: string } };
    if (e?.code === "23503" || e?.cause?.code === "23503") return { ok: false, code: "invalid_input" };
    throw err;
  }
  return { ok: true };
}

/** Ends access but keeps the row as history. Idempotent: revoking when there is no active access is still ok. */
export async function revokeAccess(input: { userId: string; courseSlug: string }): Promise<CommerceResult> {
  if (!input.userId || !input.courseSlug) return { ok: false, code: "invalid_input" };
  await revokeActive(input.userId, input.courseSlug, new Date());
  return { ok: true };
}

/** Active access for one learner, newest first. */
export async function listAccess(userId: string): Promise<AccessRow[]> {
  const rows = await listActive(userId);
  return rows.map((r) => ({ courseSlug: r.courseSlug, source: r.source, grantedAt: r.grantedAt.toISOString() }));
}
