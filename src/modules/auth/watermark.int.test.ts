// Integration test: watermark ids. Real Postgres; Better Auth and Next request helpers are stubbed because this
// path never touches them. Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({}) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./auth", () => ({ auth: {} }));

import { db } from "@/lib/db";
import { authUser } from "./schema";
import { findUserByWatermarkId, getWatermarkId } from "./service";
import { WATERMARK_ID_PATTERN } from "./watermark";

const stamp = Date.now();
let counter = 0;
const makeUser = async () => {
  const id = `wm-test-${stamp}-${counter++}`;
  await db.execute(sql`insert into auth_user (id, name, email) values (${id}, 'Asha', ${id + "@phone.invalid"})`);
  return id;
};

describe("getWatermarkId", () => {
  it("creates a code on first call and returns the same one after", async () => {
    const id = await makeUser();
    const first = await getWatermarkId(id);
    expect(first).toMatch(WATERMARK_ID_PATTERN);
    expect(await getWatermarkId(id)).toBe(first);
    const [row] = await db.select({ code: authUser.watermarkId }).from(authUser).where(eq(authUser.id, id));
    expect(row.code).toBe(first);
  });

  it("concurrent first calls end with one code", async () => {
    const id = await makeUser();
    const codes = await Promise.all([getWatermarkId(id), getWatermarkId(id), getWatermarkId(id)]);
    expect(new Set(codes).size).toBe(1);
  });

  it("gives different learners different codes", async () => {
    const [a, b] = [await makeUser(), await makeUser()];
    expect(await getWatermarkId(a)).not.toBe(await getWatermarkId(b));
  });

  it("throws for an unknown user", async () => {
    await expect(getWatermarkId(`no-such-user-${stamp}`)).rejects.toThrow();
  });
});

describe("findUserByWatermarkId", () => {
  it("finds the owner, ignoring case and spaces", async () => {
    const id = await makeUser();
    const code = await getWatermarkId(id);
    expect(await findUserByWatermarkId(` ${code.toLowerCase()} `)).toBe(id);
  });

  it("returns null for unknown or malformed codes", async () => {
    expect(await findUserByWatermarkId("AAAA-AAAA-AAAA")).toBeNull();
    expect(await findUserByWatermarkId("")).toBeNull();
    expect(await findUserByWatermarkId("ZZZZ-ZZZZ")).toBeNull();
  });
});
