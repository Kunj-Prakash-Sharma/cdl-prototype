// Chat tables: attempts, answers and results of the Meera quiz. Nothing here knows which questions exist: question
// IDs and wording live in the question set (question-set.ts), and every attempt remembers its `set_version`.
// No question text and no free text is stored (D18). The learner's name is NOT here (it lives on the auth profile).
//
// Boundary exception (decided 2026-11-03): this file imports `authUser` for the foreign key ONLY (database integrity
// and cleanup when a user is deleted). No chat code reads or writes auth tables; it goes through auth/service.ts.
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUser } from "@/modules/auth/schema";

export const chatAttemptStatus = pgEnum("chat_attempt_status", ["in_progress", "completed", "invalid", "abandoned"]);

export const chatAttempts = pgTable(
  "chat_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(), // also the analytics session id
    // Links to the learner. Holds the auth user id only: no name, phone or email in chat tables (PII stays in auth).
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    setVersion: text("set_version").notNull(), // the question set this attempt was given; scored against this version
    status: chatAttemptStatus("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastAnswerAt: timestamp("last_answer_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("chat_attempts_user_idx").on(t.userId, t.startedAt),
    // At most one unfinished attempt per learner, enforced by the database (two tabs cannot both create one).
    uniqueIndex("chat_attempts_one_open_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

export const chatAnswers = pgTable(
  "chat_answers",
  {
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => chatAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(), // fixed question ID, never the question text
    variantId: text("variant_id"), // which wording was shown ("o-E-1.v2"); null for basics, which have one wording
    value: smallint("value").notNull(), // 1 to 5 for scored questions; the 0-based option position for basics
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // The primary key is the "unique (attempt, question)" rule: a second tap overwrites instead of adding a row.
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const chatResults = pgTable("chat_results", {
  attemptId: uuid("attempt_id")
    .primaryKey()
    .references(() => chatAttempts.id, { onDelete: "cascade" }),
  setVersion: text("set_version").notNull(),
  // { ocean: { O: { score, band }, ... }, riasec: { R: 38, ... } }: whatever traits the set has.
  scores: jsonb("scores").$type<Record<string, unknown>>().notNull(),
  holland: text("holland"), // top three interest letters in rank order, e.g. "ISA"; null when the profile is flat
  hollandClose: boolean("holland_close").notNull().default(false),
  flat: boolean("flat").notNull().default(false),
  // One entry per stage, so adding a stage never needs a new column: { "ocean": "ok", "riasec": "ok" }
  stageStatus: jsonb("stage_status").$type<Record<string, "ok" | "incomplete" | "invalid">>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
