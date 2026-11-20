import { logger } from "@/lib/logger";

/**
 * Runs a server action body. Expected failures are returned by the body as `{ ok: false, code }`; anything that still
 * throws becomes `fallback` (a fixed code, never a stack trace or SQL), and is logged without personal data.
 * Next's own redirect/not-found control flow (errors with a `NEXT_` digest, thrown by requireUser/requireAdmin) is
 * rethrown so Next can handle it.
 */
export async function guardAction<R>(name: string, run: () => Promise<R>, fallback: R): Promise<R> {
  try {
    return await run();
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_")) throw err;
    logger.error("server action failed", { action: name, errorName: err instanceof Error ? err.name : "unknown" });
    return fallback;
  }
}
