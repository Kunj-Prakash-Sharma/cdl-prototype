// Which wording of a question a learner sees. Pure and deterministic: the same session and item always give the same
// variant, so a refresh or a resume shows the same text and nothing about the choice has to be stored
// (assessment.md section 4). No Math.random, no clock.
import type { Item, Variant } from "./question-set";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const utf8 = new TextEncoder();

/** 32-bit FNV-1a over the UTF-8 bytes of `text`. Standard algorithm, so it can be checked against published vectors. */
export function fnv1a(text: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of utf8.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Index (0 to count - 1) of the variant for this session and item: hash of `sessionId + itemId`, modulo `count`.
 * A NUL separator keeps ("ab", "c") and ("a", "bc") from hashing the same.
 */
export function pickVariant(sessionId: string, itemId: string, count: number): number {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError(`variant count must be a positive integer, got ${count}`);
  return fnv1a(`${sessionId}\u0000${itemId}`) % count;
}

/** The variant of `item` this session sees. */
export function variantFor(sessionId: string, item: Item): Variant {
  return item.variants[pickVariant(sessionId, item.id, item.variants.length)]!;
}
