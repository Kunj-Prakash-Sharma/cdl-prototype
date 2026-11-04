import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/analytics", () => ({ analytics: { track: vi.fn() } }));

import { analytics } from "@/integrations/analytics";
import { logger } from "@/lib/logger";
import { secondsBetween, trackChat } from "./events";

const track = vi.mocked(analytics.track);

afterEach(() => vi.restoreAllMocks());

describe("trackChat: analytics never hurts the learner's request", () => {
  it("sends the event under the attempt id", () => {
    track.mockReset();
    const props = { setVersion: "1.0.0", hollandClose: false, flat: false, durationSeconds: 90 };
    trackChat("attempt-1", "chat_completed", props);
    expect(track).toHaveBeenCalledExactlyOnceWith("attempt-1", "chat_completed", props);
  });

  it("swallows an error thrown right away, and logs it", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    track.mockReset().mockImplementation(() => {
      throw new Error("analytics down");
    });
    expect(() => trackChat("attempt-1", "chat_retake", {})).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("swallows a rejected promise, and logs it", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    track.mockReset().mockRejectedValue(new Error("analytics down"));
    expect(() => trackChat("attempt-1", "chat_retake", {})).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
  });
});

describe("secondsBetween", () => {
  it("rounds to whole seconds", () => {
    expect(secondsBetween(new Date(0), new Date(4400))).toBe(4);
    expect(secondsBetween(new Date(0), new Date(4600))).toBe(5);
  });

  it("is never negative", () => {
    expect(secondsBetween(new Date(5000), new Date(0))).toBe(0);
  });
});
