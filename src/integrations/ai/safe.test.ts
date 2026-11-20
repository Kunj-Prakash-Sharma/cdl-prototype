import { describe, expect, it, vi } from "vitest";
import { rewordWithFallback } from "./safe";
import type { AiProvider } from "./types";

const input = { questionId: "q1", text: "What do you enjoy most?" };

describe("rewordWithFallback", () => {
  it("returns the reworded text when the AI works", async () => {
    const ai: AiProvider = { rewordQuestion: async () => "What do you love doing?" };
    expect(await rewordWithFallback(ai, input, 100)).toBe("What do you love doing?");
  });
  it("falls back to the approved wording when the AI throws", async () => {
    const ai: AiProvider = {
      rewordQuestion: async () => {
        throw new Error("spend cap reached");
      },
    };
    expect(await rewordWithFallback(ai, input, 100)).toBe(input.text);
  });
  it("falls back when the AI returns nothing", async () => {
    const ai: AiProvider = { rewordQuestion: async () => "   " };
    expect(await rewordWithFallback(ai, input, 100)).toBe(input.text);
  });
  it("falls back when the AI is too slow", async () => {
    vi.useFakeTimers();
    const ai: AiProvider = { rewordQuestion: () => new Promise(() => {}) };
    const pending = rewordWithFallback(ai, input, 3000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toBe(input.text);
    vi.useRealTimers();
  });
});
