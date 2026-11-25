import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetHomeAnswer, HOME_ANSWER_TTL_MS, keepHomeAnswer, takeHomeAnswer } from "./home-answer";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("the kept Home answer", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("is taken once", () => {
    keepHomeAnswer("college", 1000);
    expect(takeHomeAnswer(2000)).toBe("college");
    expect(takeHomeAnswer(2000)).toBeNull();
  });

  it("expires, so an answer the learner walked away from is not applied later", () => {
    keepHomeAnswer("college", 0);
    expect(takeHomeAnswer(HOME_ANSWER_TTL_MS + 1)).toBeNull();
    // ...and it is gone, not just ignored.
    expect(takeHomeAnswer(0)).toBeNull();
  });

  it("is forgotten when Home shows the replies again", () => {
    keepHomeAnswer("college", 0);
    forgetHomeAnswer();
    expect(takeHomeAnswer(1)).toBeNull();
  });

  it("ignores a value it did not write (an old format or a hand-edited one)", () => {
    sessionStorage.setItem("home-answer", "college");
    expect(takeHomeAnswer()).toBeNull();
    sessionStorage.setItem("home-answer", JSON.stringify({ id: 3, at: 0 }));
    expect(takeHomeAnswer(1)).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => keepHomeAnswer("college")).not.toThrow();
    expect(() => forgetHomeAnswer()).not.toThrow();
    expect(takeHomeAnswer()).toBeNull();
  });
});
