// Commerce tables. Entitlements = what a learner MAY access; orders (what was bought) are a separate table that
// arrives with payments (D17). Nothing here knows about video or lessons: access is per course slug.
//
// Boundary exception (same as chat/schema.ts): imports `authUser` for the foreign key ONLY.
import { sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUser } from "@/modules/auth/schema";

export const entitlementSource = pgEnum("entitlement_source", ["manual", "purchase"]);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    courseSlug: text("course_slug").notNull(),
    source: entitlementSource("source").notNull().default("manual"),
    grantedBy: text("granted_by"), // admin user id; null for purchases
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }), // null = active
  },
  // One ACTIVE row per user + course; a revoked row does not block a new grant.
  (t) => [
    uniqueIndex("entitlements_active_unique")
      .on(t.userId, t.courseSlug)
      .where(sql`${t.revokedAt} is null`),
  ],
);
