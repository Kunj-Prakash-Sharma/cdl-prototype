import { describe, expect, it } from "vitest";
import { isFastStart } from "./mp4";

/** Builds one box: 4-byte size, 4-byte type, payload. `big` uses the 64-bit size form. */
function box(type: string, payloadLen = 0, big = false): Uint8Array {
  const header = big ? 16 : 8;
  const out = new Uint8Array(header + payloadLen);
  const view = new DataView(out.buffer);
  if (big) {
    view.setUint32(0, 1);
    view.setBigUint64(8, BigInt(out.length));
  } else {
    view.setUint32(0, out.length);
  }
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  return out;
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

describe("isFastStart", () => {
  it("is true when moov comes before mdat", () => {
    expect(isFastStart(concat(box("ftyp", 12), box("moov", 40), box("mdat", 100)))).toBe(true);
  });

  it("is false when mdat comes before moov", () => {
    expect(isFastStart(concat(box("ftyp", 12), box("mdat", 100), box("moov", 40)))).toBe(false);
  });

  it("skips a free box before moov", () => {
    expect(isFastStart(concat(box("ftyp", 12), box("free", 30), box("moov", 40), box("mdat", 10)))).toBe(true);
  });

  it("handles a 64-bit box size", () => {
    expect(isFastStart(concat(box("ftyp", 12), box("free", 30, true), box("moov", 40)))).toBe(true);
  });

  it("returns null when neither moov nor mdat is in the bytes", () => {
    expect(isFastStart(concat(box("ftyp", 12), box("free", 30)))).toBeNull();
    expect(isFastStart(new Uint8Array())).toBeNull();
  });

  it("never reads past the end on a truncated box", () => {
    const truncatedHeader = concat(box("ftyp", 12), new Uint8Array([0, 0, 0, 20, 0x66, 0x72]));
    expect(isFastStart(truncatedHeader)).toBeNull();
    const truncatedBig = concat(box("ftyp", 12), new Uint8Array([0, 0, 0, 1, 0x66, 0x72, 0x65, 0x65, 0, 0]));
    expect(isFastStart(truncatedBig)).toBeNull();
    const bigSizeBeyondEnd = box("free", 30).slice(0, 12);
    expect(isFastStart(bigSizeBeyondEnd)).toBeNull();
  });

  it("stops on a corrupt zero-sized-header box instead of looping", () => {
    const corrupt = new Uint8Array([0, 0, 0, 4, 0x66, 0x72, 0x65, 0x65]);
    expect(isFastStart(corrupt)).toBeNull();
  });
});
