import { describe, expect, it } from "vitest";
import { cn, formatClock, formatCompact, formatMinutes, formatPrice } from "./format";

describe("format", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatPrice(2499)).toBe("₹2,499");
    expect(formatPrice(125000)).toBe("₹1,25,000");
  });
  it("formats compact counts", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(2341)).toBe("2.3K");
    expect(formatCompact(3000)).toBe("3K");
  });
  it("formats minutes and clock", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(75)).toBe("1h 15m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatClock(125)).toBe("2:05");
  });
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
