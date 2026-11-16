import { describe, expect, it } from "vitest";
import { handlers, schedules } from "./handlers";

describe("worker jobs", () => {
  it("has a handler for every scheduled job, and every schedule is a 5-field cron", () => {
    for (const [job, cron] of Object.entries(schedules)) {
      expect(handlers[job], `no handler for scheduled job ${job}`).toBeTypeOf("function");
      expect(cron.trim().split(/\s+/)).toHaveLength(5);
    }
  });
});
