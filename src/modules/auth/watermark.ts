import { randomInt } from "node:crypto";

/** No 0/O, 1/I/L: a learner reading the code aloud (or an admin tracing a leak) cannot mix them up. */
export const WATERMARK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** `XXXX-XXXX`, random. Uniqueness is decided by the database (unique column), not here. */
export function generateWatermarkId(pick: (max: number) => number = randomInt): string {
  const chars = Array.from({ length: 8 }, () => WATERMARK_ALPHABET[pick(WATERMARK_ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export const WATERMARK_ID_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;
