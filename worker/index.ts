import { queue } from "@/integrations/queue";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { handlers, schedules } from "./handlers";

async function main() {
  await queue.start();
  for (const [job, handler] of Object.entries(handlers)) await queue.register(job, handler);
  for (const [job, cron] of Object.entries(schedules)) await queue.schedule(job, cron);
  logger.info("worker started", {
    jobs: Object.keys(handlers),
    scheduled: Object.keys(schedules),
    nodeEnv: env.NODE_ENV,
  });

  const stop = async (signal: string) => {
    logger.info("worker stopping", { signal });
    await queue.stop();
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((err) => {
  // Startup errors carry no user data, so print the real message.
  console.error("worker failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
