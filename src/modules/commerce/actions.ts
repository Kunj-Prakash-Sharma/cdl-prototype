"use server";

// Admin actions to give or take away course access by hand. Thin: zod -> requireAdmin() -> service -> `{ ok, code }`.
// Commerce does not import catalog: the course slug is checked against the course list through catalog's service here.
import { z } from "zod";
import { guardAction } from "@/lib/guard-action";
import { requireAdmin } from "@/modules/auth/service";
import { courseExists } from "@/modules/catalog/service";
import { grantAccess, revokeAccess, type CommerceErrorCode } from "./service";
import type { ActionResult } from "@/lib/action-result";

type Result = ActionResult<object, CommerceErrorCode | "unknown">;

const grantSchema = z.object({
  userId: z.string().min(1).max(64),
  courseSlug: z.string().min(1).max(100).refine(courseExists, "unknown course"),
});
// Revoking does not check the course list: access to a course removed from the list must still be revocable.
const revokeSchema = z.object({ userId: z.string().min(1).max(64), courseSlug: z.string().min(1).max(100) });

const invalid = { ok: false, code: "invalid_input" } as const;
const fallback = { ok: false, code: "unknown" } as const;

export async function grantCourseAccessAction(input: unknown): Promise<Result> {
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guardAction<Result>(
    "grantCourseAccess",
    async () => {
      const admin = await requireAdmin();
      return grantAccess({ ...parsed.data, grantedBy: admin.userId });
    },
    fallback,
  );
}

export async function revokeCourseAccessAction(input: unknown): Promise<Result> {
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guardAction<Result>(
    "revokeCourseAccess",
    async () => {
      await requireAdmin();
      return revokeAccess(parsed.data);
    },
    fallback,
  );
}
