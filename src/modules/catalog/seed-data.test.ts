import { describe, expect, it } from "vitest";
import { MAX_DURATION_SEC } from "./limits";
import { allLessons, COURSES } from "./courses";
import { seedLessonsFor } from "./seed-data";

describe("seedLessonsFor", () => {
  it.each(COURSES.map((c) => [c.slug, c] as const))(
    "%s: flat, ordered, with preview flags and seconds",
    (_slug, course) => {
      const rows = seedLessonsFor(course);
      const source = allLessons(course);
      expect(rows).toHaveLength(source.length);
      rows.forEach((row, i) => {
        expect(row.position).toBe(i + 1);
        expect(row.title).toBe(source[i]!.title);
        expect(row.isPreview).toBe(source[i]!.preview);
        expect(row.durationSec).toBe(Math.round(source[i]!.minutes * 60));
        expect(row.durationSec).toBeGreaterThan(0);
        expect(row.durationSec).toBeLessThanOrEqual(MAX_DURATION_SEC);
      });
    },
  );
});
