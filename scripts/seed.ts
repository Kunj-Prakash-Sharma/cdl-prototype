// Seeds local/dev data. Never run against production. Safe to run twice: a course that already has lessons is skipped.
//
// Video (docs/specs/video.md, "Dev data"): one published lesson per static course lesson, each with one ready FAKE video
// (the fake adapter plays public/sample/lecture.mp4), and every admin account gets access to every course.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { parseEnv } from "@/lib/env-schema";

const env = parseEnv();
if (env.NODE_ENV === "production") {
  console.error("seed: refusing to run in production");
  process.exit(1);
}

async function main() {
  // Loaded after the production check, so a production run never opens a database connection.
  const { db } = await import("@/lib/db");
  const { authUser } = await import("@/modules/auth/schema");
  const { COURSES } = await import("@/modules/catalog/courses");
  const { seedLessonsFor } = await import("@/modules/catalog/seed-data");
  const { lessons, videos } = await import("@/modules/catalog/schema");
  const { entitlements } = await import("@/modules/commerce/schema");

  let createdLessons = 0;
  for (const course of COURSES) {
    const existing = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.courseSlug, course.slug))
      .limit(1);
    if (existing.length > 0) continue;
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const row of seedLessonsFor(course)) {
        const lessonId = randomUUID();
        const videoId = randomUUID();
        await tx.insert(lessons).values({
          id: lessonId,
          courseSlug: course.slug,
          title: row.title,
          position: row.position,
          isPreview: row.isPreview,
          currentVideoId: videoId,
          publishedAt: now,
        });
        await tx.insert(videos).values({
          id: videoId,
          lessonId,
          provider: "fake",
          providerRef: `videos/${videoId}`,
          state: "ready",
          declaredSizeBytes: 1_000_000,
          sizeBytes: 1_000_000,
          durationSec: row.durationSec,
          fastStart: true,
          readyAt: now,
        });
        createdLessons++;
      }
    });
  }

  const admins = await db.select({ id: authUser.id }).from(authUser).where(eq(authUser.role, "admin"));
  for (const admin of admins) {
    for (const course of COURSES) {
      // The partial unique index keeps one active row per user and course, so re-running adds nothing.
      await db
        .insert(entitlements)
        .values({ userId: admin.id, courseSlug: course.slug, source: "manual", grantedBy: admin.id })
        .onConflictDoNothing();
    }
  }
  console.log(`seed: ${createdLessons} lessons created, ${admins.length} admin account(s) have access to every course`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
