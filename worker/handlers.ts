import type { JobHandler } from "@/integrations/queue";

/** Job name -> handler. Modules add their jobs here (e.g. "email.send", "video.sync"). */
export const handlers: Record<string, JobHandler> = {};
