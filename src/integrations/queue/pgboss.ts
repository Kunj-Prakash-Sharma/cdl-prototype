import { PgBoss } from "pg-boss";
import { logger } from "@/lib/logger";
import type { EnqueueOptions, JobHandler, QueueProvider } from "./types";

/** Jobs live in the same Postgres as the app (pg-boss creates its own `pgboss` schema). */
export class PgBossQueue implements QueueProvider {
  private boss: PgBoss;
  private queues = new Set<string>();

  constructor(connectionString: string) {
    this.boss = new PgBoss(connectionString);
    this.boss.on("error", (err) => logger.error("pg-boss error", { err }));
  }

  async start() {
    await this.boss.start();
  }
  async stop() {
    await this.boss.stop();
  }

  private async ensureQueue(job: string) {
    if (this.queues.has(job)) return;
    await this.boss.createQueue(job);
    this.queues.add(job);
  }

  async enqueue(job: string, payload: object, options?: EnqueueOptions) {
    await this.ensureQueue(job);
    await this.boss.send(job, payload, {
      ...(options?.delaySec ? { startAfter: options.delaySec } : {}),
      ...(options?.singletonKey ? { singletonKey: options.singletonKey } : {}),
    });
  }

  async register(job: string, handler: JobHandler) {
    await this.ensureQueue(job);
    await this.boss.work(job, async (jobs) => {
      for (const j of jobs) await handler(j.data);
    });
  }
}
