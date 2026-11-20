// Integration test: entitlements. Real commerce service + real Postgres. Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { entitlements } from "./schema";
import { grantAccess, hasAccess, listAccess, revokeAccess } from "./service";

const stamp = Date.now();
let counter = 0;
let userId = "";
const admin = `commerce-admin-${stamp}`;

beforeEach(async () => {
  userId = `commerce-test-${stamp}-${counter++}`;
  await db.execute(
    sql`insert into auth_user (id, name, email) values (${userId}, 'Asha', ${userId + "@phone.invalid"})`,
  );
});

const rows = () => db.select().from(entitlements).where(eq(entitlements.userId, userId));

describe("entitlements", () => {
  it("has no access before a grant", async () => {
    expect(await hasAccess(userId, "web-dev")).toBe(false);
  });

  it("grant gives access, and granting twice keeps one active row", async () => {
    expect(await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin })).toEqual({ ok: true });
    expect(await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin })).toEqual({ ok: true });
    expect(await hasAccess(userId, "web-dev")).toBe(true);
    expect(await rows()).toHaveLength(1);
  });

  it("access is per course", async () => {
    await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin });
    expect(await hasAccess(userId, "design")).toBe(false);
  });

  it("revoke ends access and keeps the row as history; revoking twice is ok", async () => {
    await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin });
    expect(await revokeAccess({ userId, courseSlug: "web-dev" })).toEqual({ ok: true });
    expect(await revokeAccess({ userId, courseSlug: "web-dev" })).toEqual({ ok: true });
    expect(await hasAccess(userId, "web-dev")).toBe(false);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0].revokedAt).not.toBeNull();
  });

  it("grant after revoke works (partial unique index)", async () => {
    await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin });
    await revokeAccess({ userId, courseSlug: "web-dev" });
    await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin });
    expect(await hasAccess(userId, "web-dev")).toBe(true);
    expect(await rows()).toHaveLength(2);
  });

  it("listAccess shows only active access", async () => {
    await grantAccess({ userId, courseSlug: "web-dev", grantedBy: admin });
    await grantAccess({ userId, courseSlug: "design", grantedBy: admin });
    await revokeAccess({ userId, courseSlug: "design" });
    const list = await listAccess(userId);
    expect(list.map((r) => r.courseSlug)).toEqual(["web-dev"]);
    expect(list[0].source).toBe("manual");
  });

  it("rejects empty input", async () => {
    expect(await grantAccess({ userId: "", courseSlug: "x", grantedBy: admin })).toEqual({
      ok: false,
      code: "invalid_input",
    });
  });
});
