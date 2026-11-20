import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeVideo } from "./fake";
import type { VideoProvider } from "./types";

export type { EncodeEvent, VideoProvider, VideoState } from "./types";
export const video: VideoProvider = pickAdapter("video", env.VIDEO_PROVIDER, { fake: () => fakeVideo }, env.NODE_ENV);
