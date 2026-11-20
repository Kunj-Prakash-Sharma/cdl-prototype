import { describe, expect, it } from "vitest";
import { LEADS_PAGE_SIZE, pageCountFor, parseLeadFilters } from "./admin-leads";

describe("parseLeadFilters", () => {
  it("defaults to all statuses on page 1", () => {
    expect(parseLeadFilters({})).toEqual({ status: "all", page: 1 });
  });

  it("accepts the three real statuses", () => {
    for (const status of ["new", "contacted", "closed"] as const) {
      expect(parseLeadFilters({ status }).status).toBe(status);
    }
  });

  it("never trusts the URL: unknown statuses and bad pages fall back", () => {
    expect(parseLeadFilters({ status: "'; drop table leads;--", page: "abc" })).toEqual({ status: "all", page: 1 });
    expect(parseLeadFilters({ page: "-5" }).page).toBe(1);
    expect(parseLeadFilters({ page: "0" }).page).toBe(1);
    expect(parseLeadFilters({ page: "99999999" }).page).toBe(10_000);
    expect(parseLeadFilters({ status: ["closed", "new"], page: ["3"] })).toEqual({ status: "closed", page: 3 });
  });
});

describe("pageCountFor", () => {
  it("has at least one page, and rounds up", () => {
    expect(pageCountFor(0)).toBe(1);
    expect(pageCountFor(LEADS_PAGE_SIZE)).toBe(1);
    expect(pageCountFor(LEADS_PAGE_SIZE + 1)).toBe(2);
  });
});
