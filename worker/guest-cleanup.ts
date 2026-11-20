// Daily clean-up of guest accounts (D80). A guest lives 7 days. Before one is deleted, the quiz of a guest that verified a
// phone is handed to the real learner (the foreign key cascades, so deleting first would erase it), and a guest that has a
// lead is never deleted. The worker is the one place that may talk to several modules, through their service files.
import { deleteGuests, expiredGuests } from "@/modules/auth/service";
import { claimLinkedGuests } from "@/modules/chat/service";
import { userIdsWithLeads } from "@/modules/leads/service";
import { logger } from "@/lib/logger";

export const GUEST_CLEANUP_JOB = "auth.guest_cleanup";
export const GUEST_CLEANUP_CRON = "17 3 * * *"; // 03:17 UTC every day (off the hour, away from other jobs)

/** Returns how many guests were deleted. Safe to run twice. */
export async function cleanUpGuests(now = new Date()): Promise<number> {
  const guests = await expiredGuests(now);
  if (guests.length === 0) return 0;
  // Hand the quiz over first. A failure here throws, so the job retries and nothing is deleted before the claim.
  for (const learnerId of new Set(guests.flatMap((g) => (g.linkedUserId ? [g.linkedUserId] : [])))) {
    await claimLinkedGuests(learnerId);
  }
  const keep = new Set(await userIdsWithLeads(guests.map((g) => g.id)));
  const removed = await deleteGuests(guests.map((g) => g.id).filter((id) => !keep.has(id)));
  logger.info("guest clean-up", { removed, kept: keep.size });
  return removed;
}

export const guestCleanupHandler = async () => {
  await cleanUpGuests();
};
