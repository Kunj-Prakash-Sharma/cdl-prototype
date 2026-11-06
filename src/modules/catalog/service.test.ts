import { describe, expect, it } from "vitest";
import { COURSES } from "./courses";
import { coursesForInterests } from "./service";

describe("coursesForInterests", () => {
  it("puts the course that matches the learner's first interest on top", () => {
    const { courses, fallback } = coursesForInterests(["I", "C", "R"]);
    expect(fallback).toBe(false);
    expect(courses[0]!.slug).toBe("data-analytics-foundations"); // types I, C: 3 + 2 points
  });

  it("scores a higher-ranked interest above a lower-ranked one", () => {
    const first = coursesForInterests(["A", "S", "E"]).courses[0]!.slug;
    expect(first).toBe("ux-design-essentials"); // A, S: 3 + 2
    const second = coursesForInterests(["S", "A", "E"]).courses[0]!.slug;
    expect(second).toBe("ux-design-essentials"); // A, S: 2 + 3, same total, more popular than communication (S, E: 3 + 1)
  });

  it("returns at most `limit` courses, none with zero matching types", () => {
    const { courses } = coursesForInterests(["R", "I", "A"], 2);
    expect(courses).toHaveLength(2);
    const matching = new Set(
      COURSES.filter((c) => c.riasecTypes.some((t) => ["R", "I", "A"].includes(t))).map((c) => c.slug),
    );
    for (const course of courses) expect(matching.has(course.slug)).toBe(true);
  });

  it("falls back to the most popular courses for a flat profile (no code), and says so", () => {
    const { courses, fallback } = coursesForInterests([]);
    expect(fallback).toBe(true);
    const popular = [...COURSES]
      .sort((a, b) => b.learners - a.learners)
      .slice(0, 3)
      .map((c) => c.slug);
    expect(courses.map((c) => c.slug)).toEqual(popular);
  });

  it("hands out plain fields only (no icon component, price or learner count) so a client component can take them", () => {
    const [course] = coursesForInterests(["I"]).courses;
    expect(Object.keys(course!).sort()).toEqual(["slug", "tagline", "title"]);
    expect(() => JSON.stringify(course)).not.toThrow();
  });

  it("gives every sample course at least one interest type", () => {
    for (const course of COURSES) expect(course.riasecTypes.length).toBeGreaterThan(0);
  });
});
