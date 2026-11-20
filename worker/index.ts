import { queue } from "@/integrations/queue";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { handlers } from "./handlers";

async function main() {
  await queue.start();
  for (const [job, handler] of Object.entries(handlers)) await queue.register(job, handler);
  logger.info("worker started", { jobs: Object.keys(handlers), nodeEnv: env.NODE_ENV });

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
