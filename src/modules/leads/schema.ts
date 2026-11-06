// Callback requests ("leads"). One row per request from a learner who asked the team to call them (E6).
// Boundary exception, same as chat/schema.ts: this file imports `authUser` for the foreign key ONLY (integrity and
// cleanup when a user is deleted). No leads code reads or writes auth tables; it goes through auth/service.ts.
import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUser } from "@/modules/auth/schema";

export const leadStatus = pgEnum("lead_status", ["new", "contacted", "closed"]);
/** Who the team speaks to. Derived from the learner's age answer, never asked (D71): under 18 means a parent or guardian. */
export const leadContactRole = pgEnum("lead_contact_role", ["learner", "parent"]);
export const leadPreferredTime = pgEnum("lead_preferred_time", ["morning", "afternoon", "evening"]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    // The chat attempt whose report the request came from. No foreign key: leads never import chat's schema.
    attemptId: uuid("attempt_id").notNull(),
    phone: text("phone").notNull(), // PII. E.164, the number the learner consented to be called on
    contactRole: leadContactRole("contact_role").notNull(),
    preferredTime: leadPreferredTime("preferred_time"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    // Which consent wording was shown (consent-copy.ts). The role says which of its two texts the learner saw.
    consentVersion: text("consent_version").notNull(),
    status: leadStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
    // When the team email for this request was sent. Null until then: a retry after a crash never sends it twice, and
    // a lead with no alert after a few minutes is visible to a sweep (not built yet).
    alertedAt: timestamp("alerted_at", { withTimezone: true }),
  },
  (t) => [
    // At most one NEW request per learner, enforced by the database: repeat taps and two tabs make one lead, and the
    // team email goes out once. A new request is possible again after the team has marked the old one.
    uniqueIndex("leads_one_new_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'new'`),
    index("leads_status_created_idx").on(t.status, t.createdAt),
  ],
);
