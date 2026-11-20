import { describe, expect, it } from "vitest";
import { generateWatermarkId, WATERMARK_ALPHABET, WATERMARK_ID_PATTERN } from "./watermark";

describe("generateWatermarkId", () => {
  it("has the XXXX-XXXX format", () => {
    for (let i = 0; i < 200; i++) expect(generateWatermarkId()).toMatch(WATERMARK_ID_PATTERN);
  });

  it("never uses 0, O, 1, I or L", () => {
    expect(WATERMARK_ALPHABET).not.toMatch(/[01OIL]/);
    for (let i = 0; i < 200; i++) expect(generateWatermarkId()).not.toMatch(/[01OIL]/);
  });

  it("uses the whole alphabet from first to last index", () => {
    expect(generateWatermarkId(() => 0)).toBe("AAAA-AAAA");
    expect(generateWatermarkId(() => WATERMARK_ALPHABET.length - 1)).toBe("9999-9999");
  });

  it("differs between calls", () => {
    expect(new Set(Array.from({ length: 50 }, () => generateWatermarkId())).size).toBeGreaterThan(45);
  });
});
