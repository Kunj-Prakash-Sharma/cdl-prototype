/**
 * Is this MP4 "fast-start" (the `moov` index box before the `mdat` media box)? A fast-start file can begin playing
 * before it is fully downloaded.
 *
 * Walks the top-level boxes: 4-byte big-endian size + 4-byte type. Size 1 means an 8-byte size follows the type;
 * size 0 means the box runs to the end of the file.
 * Returns `true` (moov first), `false` (mdat first), or `null` when neither box is in the bytes given: the caller
 * reads more (up to 1 MB) and then treats `null` as `false`.
 */
export function isFastStart(bytes: Uint8Array): boolean | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const size32 = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === "moov") return true;
    if (type === "mdat") return false;

    let size: number;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return null;
      size = Number(view.getBigUint64(offset + 8));
    } else if (size32 === 0) {
      return null; // runs to end of file, and it is not moov or mdat
    } else {
      size = size32;
    }
    const headerSize = size32 === 1 ? 16 : 8;
    if (size < headerSize) return null; // corrupt box, stop rather than loop forever
    offset += size;
  }
  return null;
}
