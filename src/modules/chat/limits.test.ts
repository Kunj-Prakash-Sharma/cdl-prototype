import { describe, expect, it } from "vitest";
import { createLimiter } from "./limits";

describe("createLimiter", () => {
  it("allows up to max requests inside the window, then refuses with a wait time", () => {
    const limiter = createLimiter(3, 60_000);
    for (let i = 0; i < 3; i++) expect(limiter.hit("a", 1_000 + i)).toEqual({ ok: true });
    expect(limiter.hit("a", 10_000)).toEqual({ ok: false, retryAfterSec: 51 }); // oldest hit (at 1_000) leaves at 61_000
  });

  it("lets requests through again once the oldest ones leave the window", () => {
    const limiter = createLimiter(2, 60_000);
    limiter.hit("a", 0);
    limiter.hit("a", 1_000);
    expect(limiter.hit("a", 2_000).ok).toBe(false);
    expect(limiter.hit("a", 60_001).ok).toBe(true);
  });

  it("keeps different keys (learners) apart", () => {
    const limiter = createLimiter(1, 60_000);
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("b", 0).ok).toBe(true);
    expect(limiter.hit("a", 1).ok).toBe(false);
  });

  it("does not count refused requests against the learner", () => {
    const limiter = createLimiter(1, 60_000);
    limiter.hit("a", 0);
    for (let i = 1; i < 50; i++) limiter.hit("a", i);
    expect(limiter.hit("a", 60_000).ok).toBe(true);
  });

  it("stays inside its memory bound even when every key is active", () => {
    const limiter = createLimiter(5, 60_000, 3);
    for (let i = 0; i < 20; i++) limiter.hit(`user-${i}`, i);
    expect(limiter.size()).toBeLessThanOrEqual(3);
  });

  it("always waits at least one second", () => {
    const limiter = createLimiter(1, 1_000);
    limiter.hit("a", 0);
    const refused = limiter.hit("a", 999);
    expect(refused).toEqual({ ok: false, retryAfterSec: 1 });
  });
});
