// Catalog tables for video lessons (docs/specs/video.md). Courses stay static in courses.ts (no courses table), so
// `course_slug` is checked against courses.ts in the service, not by a foreign key.
//
// Boundary exception (same as chat/schema.ts): imports `authUser` for the foreign key ONLY, so a deleted user takes
// their progress with them. No catalog code reads or writes auth tables.
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  boolean,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUser } from "@/modules/auth/schema";

export const videoState = pgEnum("video_state", ["uploading", "ready", "failed"]);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseSlug: text("course_slug").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    isPreview: boolean("is_preview").notNull().default(false),
    // No foreign key: lessons and videos would point at each other. The service sets it inside a transaction.
    currentVideoId: uuid("current_video_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }), // null = draft
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lessons_course_position_idx").on(t.courseSlug, t.position)],
);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // value of VIDEO_PROVIDER when the video was created
    providerRef: text("provider_ref").notNull(), // opaque: only the adapter reads or builds it
    state: videoState("state").notNull().default("uploading"),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    durationSec: integer("duration_sec"),
    fastStart: boolean("fast_start"),
    replacedAt: timestamp("replaced_at", { withTimezone: true }), // set when a newer video became current
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
  },
  (t) => [index("videos_lesson_idx").on(t.lessonId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    // Auth user id only: no name, phone or email here (PII stays in auth).
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    positionSec: integer("position_sec").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);
