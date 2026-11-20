import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { createFakeVideo } from "./fake";
import type { VideoProvider } from "./types";

export type { MarkReadyResult, VideoProvider, VideoState } from "./types";
export const video: VideoProvider = pickAdapter(
  "video",
  env.VIDEO_PROVIDER,
  { fake: () => createFakeVideo(env.NODE_ENV === "production" ? undefined : env.FAKE_VIDEO_SAMPLE_URL) },
  env.NODE_ENV,
);
