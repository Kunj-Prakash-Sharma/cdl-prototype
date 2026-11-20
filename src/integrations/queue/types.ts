export type JobHandler = (payload: unknown) => Promise<void>;

export interface EnqueueOptions {
  delaySec?: number;
  /** Jobs with the same key are not queued twice while one is pending. */
  singletonKey?: string;
}

export interface QueueProvider {
  /** Connect. Call once in the web app and once in the worker. */
  start(): Promise<void>;
  stop(): Promise<void>;
  enqueue(job: string, payload: object, options?: EnqueueOptions): Promise<void>;
  /** Worker only. If the handler throws, the job is retried by the queue. */
  register(job: string, handler: JobHandler): Promise<void>;
  /**
   * Worker only. Runs `job` on a cron schedule (5 fields, UTC). Safe to call on every worker start and from several
   * workers: the schedule is stored once, and each tick runs the job once.
   */
  schedule(job: string, cron: string): Promise<void>;
}
