import { describe, expect, it } from "vitest";
import { escapeLike, pageCount, parseUserFilters } from "./admin-users";

describe("parseUserFilters", () => {
  it("uses safe defaults", () => {
    expect(parseUserFilters({})).toEqual({ q: "", role: "all", page: 1 });
  });

  it("accepts a known role and a page", () => {
    expect(parseUserFilters({ role: "admin", page: "3" })).toEqual({ q: "", role: "admin", page: 3 });
    expect(parseUserFilters({ role: "learner" }).role).toBe("learner");
  });

  it.each(["superuser", "ADMIN", "", "all", "'; drop table auth_user;--"])("treats role %j as all", (role) => {
    expect(parseUserFilters({ role }).role).toBe("all");
  });

  it.each(["0", "-4", "abc", "", "NaN", "1e9"])("clamps page %j into a valid range", (page) => {
    const parsed = parseUserFilters({ page }).page;
    expect(parsed).toBeGreaterThanOrEqual(1);
    expect(parsed).toBeLessThanOrEqual(10_000);
  });

  it("caps an absurd page number", () => {
    expect(parseUserFilters({ page: "99999999" }).page).toBe(10_000);
  });

  it("trims and caps the search text", () => {
    expect(parseUserFilters({ q: "  6780  " }).q).toBe("6780");
    expect(parseUserFilters({ q: "x".repeat(200) }).q).toHaveLength(30);
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseUserFilters({ q: ["a", "b"], role: ["admin", "learner"], page: ["2", "5"] })).toEqual({
      q: "a",
      role: "admin",
      page: 2,
    });
  });
});

describe("escapeLike", () => {
  it("makes wildcards literal", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("6780")).toBe("6780");
  });
});

describe("pageCount", () => {
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [100, 5],
  ])("%i users -> %i pages", (total, pages) => {
    expect(pageCount(total)).toBe(pages);
  });
});
