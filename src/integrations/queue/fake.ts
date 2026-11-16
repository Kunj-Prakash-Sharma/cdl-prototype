import type { EnqueueOptions, JobHandler, QueueProvider } from "./types";

/** In-memory queue for tests: runs the handler inline when a job is enqueued. */
export class FakeQueue implements QueueProvider {
  private handlers = new Map<string, JobHandler>();
  readonly enqueued: { job: string; payload: object; options?: EnqueueOptions }[] = [];
  readonly scheduled = new Map<string, string>();

  async start() {}
  async stop() {}
  async enqueue(job: string, payload: object, options?: EnqueueOptions) {
    this.enqueued.push({ job, payload, options });
    await this.handlers.get(job)?.(payload);
  }
  async register(job: string, handler: JobHandler) {
    this.handlers.set(job, handler);
  }
  /** Only records the schedule: tests run the job themselves. */
  async schedule(job: string, cron: string) {
    this.scheduled.set(job, cron);
  }
}
