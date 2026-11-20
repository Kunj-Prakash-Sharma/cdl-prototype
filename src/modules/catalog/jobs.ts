// Background job: delete a replaced video 24 hours after the swap. Idempotent: safe to run twice, and a job that throws
// is retried by the queue. Logs carry the video id only.
import { z } from "zod";
import { video } from "@/integrations/video";
import { logger } from "@/lib/logger";
import * as repo from "./repo";

export const VIDEO_PURGE_JOB = "video.purge";

const payloadSchema = z.object({ videoId: z.uuid() });

export async function purgeVideo(payload: unknown): Promise<void> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    // A malformed job can never become valid: drop it (retrying would loop forever).
    logger.error("video purge job has a bad payload");
    return;
  }
  const row = await repo.getVideo(parsed.data.videoId);
  if (!row) return; // already purged
  if (row.replacedAt === null) return; // it is the live video: never delete it
  await video.remove(row.providerRef); // idempotent in the adapter; throws on a real storage error, so the job retries
  await repo.deleteVideo(row.id);
}

/** The handler the worker registers (worker/handlers.ts). */
export const videoPurgeHandler = (payload: unknown) => purgeVideo(payload);
