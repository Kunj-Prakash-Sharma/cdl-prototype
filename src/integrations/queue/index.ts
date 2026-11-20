import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { FakeQueue } from "./fake";
import { PgBossQueue } from "./pgboss";
import type { QueueProvider } from "./types";

export type { EnqueueOptions, JobHandler, QueueProvider } from "./types";
export const queue: QueueProvider = pickAdapter<QueueProvider>(
  "queue",
  env.QUEUE_PROVIDER,
  { fake: () => new FakeQueue(), pgboss: () => new PgBossQueue(env.DATABASE_URL) },
  env.NODE_ENV,
);
