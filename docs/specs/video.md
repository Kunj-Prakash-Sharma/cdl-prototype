# Spec: Video (lessons, upload, signed playback)

- **Status:** draft
- **Owner:** Vijay
- **Related decisions:** D95 (MP4, no transcoding), D96 (this spec's choices), D66 (free previews), D83 (buying needs login), D40 (no DRM, watermark), D17 (orders ≠ entitlements), D44 (pg-boss), D18 (no PII in logs or events)

## Goal
An admin uploads one MP4 per lecture through our app. A learner who owns the course (or anyone, for a preview lesson) watches it through a signed, expiring URL, with a moving watermark, and resumes where they stopped.

## Scope
Built in two phases. **Phase A needs no AWS account**: everything runs on the `fake` video adapter, with a real playable sample clip. **Phase B** swaps in the AWS adapter once the account exists.

**Phase A**
- Tables: `lessons`, `videos`, `lesson_progress` (catalog), `entitlements` (commerce), `auth_user.watermark_id` (auth).
- Admin: per course, create/edit lessons, reorder (up/down buttons), toggle preview, upload or **replace** a video (single presigned PUT, progress bar, retry from the start), publish/unpublish.
- Learner: watch page, player with watermark, signed-URL refresh, resume, completion at 90%.
- Manual access grant and revoke (commerce service + a control on the admin users page).
- Worker job `video.purge`: deletes a replaced video 24 hours later.
- Dev support: fake upload endpoint and a sample MP4, so the whole path works locally and in Playwright.

**Phase B (after the AWS account)**
- `src/integrations/video/s3.ts` adapter, env vars, bucket and CloudFront setup, one real lecture end to end.

## Out of scope
- Checkout, orders, payments, bundles, coupons (separate commerce spec). Entitlements here are only the table and `hasAccess` / grant / revoke.
- Transcoding, adaptive streaming, quality picker (D95).
- Multipart or resumable upload. A failed upload restarts. Revisit if the real files fail often (D96).
- Poster image upload (falls back to the course image), subtitles, PDFs, quizzes, modules or sections (lessons are flat per course).
- Deleting a lesson (unpublish instead). A sweep for abandoned `uploading` rows and their S3 objects (follow-up).
- Download button, offline, DRM. The player deters download but cannot stop it (D40).
- Moving courses from `courses.ts` to the database.

## Files and interfaces

### Integration: `src/integrations/video/`
Change `types.ts` and `fake.ts` (already trimmed in D95):
```ts
createUpload(input: { videoId: string; contentType: "video/mp4"; sizeBytes: number }): Promise<{ providerRef: string; uploadUrl: string }>;
markReady(providerRef: string): Promise<MarkReadyResult>;          // { ok: true, sizeBytes, fastStart } | { ok: false, reason }
getPlayback(input: { providerRef: string; expiresInSec: number }): Promise<{ url: string; expiresAt: Date }>;
remove(providerRef: string): Promise<void>;                         // new: idempotent, no error if already gone
```
- `sizeBytes` is new: the adapter signs `Content-Length` and `Content-Type` into the upload URL, so the upload cannot differ from what the service validated.
- **New pure file `src/integrations/video/mp4.ts`:** `isFastStart(bytes: Uint8Array): boolean | null`. Walks the top-level MP4 boxes (4-byte size + 4-byte type; size `1` means an 8-byte size follows; size `0` means to end of file). Returns `true` if `moov` comes before `mdat`, `false` if `mdat` comes first, `null` if neither is in the bytes given (the caller reads more, up to 1 MB, then treats `null` as `false`). Unit tested with hand-built boxes. Used by the real adapter's `markReady`.
- `fake.ts`: `createUpload` returns `uploadUrl: "/api/dev/fake-upload/<providerRef>"`; `getPlayback` returns `url: "<FAKE_VIDEO_SAMPLE_URL>?exp=<ms>"`, default `/sample/lecture.mp4` (a real, playable clip). To try a real lecture-like video, put any MP4 in `public/sample/` and set `FAKE_VIDEO_SAMPLE_URL=/sample/<name>.mp4` (dev only; ignored in production; optional in `env-schema.ts`); `markReady` returns the size given at `createUpload` (kept in a module-level map) so the size-mismatch path is testable; `remove` deletes from that map.
- Env: Phase A adds only the optional `FAKE_VIDEO_SAMPLE_URL` above. `VIDEO_PROVIDER` stays `fake`.

### Module `catalog` (`src/modules/catalog/`)
New files: `schema.ts`, `repo.ts`, `lessons.ts` (admin and listing logic), `playback.ts` (access, URL, progress), `actions.ts`, `jobs.ts`. `service.ts` re-exports the public functions below (keep the existing `coursesForInterests`).

Public service functions (other modules and pages import only these):
```ts
listLessons(courseSlug: string, opts?: { includeDraft?: boolean }): Promise<LessonView[]>        // published only unless admin asks
getPlayback(input: { lessonId: string; userId: string | null; ip: string }): Promise<PlaybackResult>
saveProgress(input: { userId: string; lessonId: string; positionSec: number }): Promise<ActionResult>
listProgress(userId: string, courseSlug: string): Promise<Map<string, { positionSec: number; completed: boolean }>>
// admin (the action calls requireAdmin first; the service trusts it)
createLesson(input: { courseSlug: string; title: string }): Promise<ActionResult<{ lessonId: string }>>
updateLesson(input: { lessonId: string; title?: string; isPreview?: boolean }): Promise<ActionResult>
moveLesson(input: { lessonId: string; direction: "up" | "down" }): Promise<ActionResult>
setPublished(input: { lessonId: string; published: boolean }): Promise<ActionResult>              // publish needs a ready current video
startVideoUpload(input: { lessonId: string; sizeBytes: number }): Promise<ActionResult<{ videoId: string; uploadUrl: string }>>
completeVideoUpload(input: { videoId: string; durationSec: number }): Promise<ActionResult<{ fastStart: boolean }>>
```
Types:
```ts
type LessonView = { id: string; courseSlug: string; title: string; position: number; isPreview: boolean; published: boolean;
                    durationSec: number | null; videoState: "none" | "uploading" | "ready" | "failed"; fastStart: boolean | null };
type PlaybackResult =
  | { ok: true; url: string; expiresAt: string; resumeSec: number; watermarkId: string | null }
  | { ok: false; code: "not_found" | "login_required" | "not_entitled" | "unavailable" | "rate_limited" };
```
`ActionResult` is the typed `{ ok, code }` result already used in `modules/auth` (reuse its type; if it lives in auth, move it to `src/lib` rather than importing auth's internals).

### Module `commerce` (new: `src/modules/commerce/`)
Files: `schema.ts`, `repo.ts`, `service.ts`, `actions.ts`, `service.test.ts`.
```ts
hasAccess(userId: string, courseSlug: string): Promise<boolean>        // active (not revoked) entitlement
grantAccess(input: { userId: string; courseSlug: string; grantedBy: string }): Promise<ActionResult>   // idempotent
revokeAccess(input: { userId: string; courseSlug: string }): Promise<ActionResult>
listAccess(userId: string): Promise<{ courseSlug: string; source: "manual" | "purchase"; grantedAt: string }[]>
```
Commerce does **not** import catalog. The admin action validates `courseSlug` against `courses.ts` through catalog's service before calling `grantAccess`.

### Module `auth`
Add to `service.ts`: `getWatermarkId(userId: string): Promise<string>`. Creates the code on first call and returns the same one forever after. Format `XXXX-XXXX` from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), random, unique; retry a few times on a unique collision. Also `findUserByWatermarkId(code: string)` for the team to trace a leak (used from a script or the admin users search, not shown to learners).

### Schema changes (then `npm run db:generate`; never edit a committed migration)
- `auth_user.watermark_id text unique` nullable. Pseudonymous: it identifies a learner only through our table. Mark with a schema comment. Check `getAuthTables()` per the comment in `auth/schema.ts`; Better Auth ignores unknown nullable columns.
- `lessons`: `id uuid pk`, `course_slug text not null` (checked against `courses.ts` in the service; no FK, courses are static), `title text not null`, `position int not null`, `is_preview boolean not null default false`, `current_video_id uuid` (no FK: lessons and videos would point at each other; the service sets it in a transaction), `published_at timestamptz` (null = draft), `created_at`, `updated_at`. Index `(course_slug, position)`.
- `videos`: `id uuid pk`, `lesson_id uuid not null → lessons.id on delete cascade`, `provider text not null` (value of `VIDEO_PROVIDER` at creation), `provider_ref text not null`, `state video_state not null default 'uploading'` (enum `uploading | ready | failed`), `declared_size_bytes bigint not null`, `size_bytes bigint`, `duration_sec int`, `fast_start boolean`, `replaced_at timestamptz`, `created_at`, `ready_at`. Index `lesson_id`.
- `lesson_progress`: `user_id text → auth_user.id on delete cascade` (foreign-key import only, same boundary exception as `chat/schema.ts`), `lesson_id uuid → lessons.id on delete cascade`, `position_sec int not null`, `completed_at timestamptz`, `updated_at`. Primary key `(user_id, lesson_id)`. No PII.
- `entitlements`: `id uuid pk`, `user_id text → auth_user.id on delete cascade`, `course_slug text not null`, `source entitlement_source not null default 'manual'` (enum `manual | purchase`), `granted_by text` (admin user id, null for purchases), `granted_at`, `revoked_at timestamptz`. Partial unique index `(user_id, course_slug) where revoked_at is null`. No `orders` table here (D17: orders come with payments).
- Export `catalog` and `commerce` schemas from `src/db/schema.ts`.

### Routes and actions
- **Server actions** (`catalog/actions.ts`, thin: zod → `requireAdmin()` / session → service → result): `createLessonAction`, `updateLessonAction`, `moveLessonAction`, `setPublishedAction`, `startVideoUploadAction`, `completeVideoUploadAction`, and for learners `getPlaybackAction({ lessonId })` and `saveProgressAction({ lessonId, positionSec })`. `getPlaybackAction` reads the user with `getSession()` (null is allowed: previews) and the IP from `x-forwarded-for`, the same way `auth/actions.ts` does.
- **Commerce actions** (`commerce/actions.ts`): `grantCourseAccessAction`, `revokeCourseAccessAction`, both `requireAdmin()`.
- **REST (dev only):** `src/app/api/dev/fake-upload/[...key]/route.ts`. `PUT` reads and discards the body, returns 200. Returns 404 unless `VIDEO_PROVIDER === "fake"` and `NODE_ENV !== "production"`.
- **Worker:** job `video.purge` in `worker/handlers.ts`, handler in `catalog/jobs.ts`.
- **Pages:**
  - Admin `src/app/(admin)/admin/courses/page.tsx` (course list with lesson counts and "n ready / n total") and `courses/[slug]/page.tsx` (lesson table + upload island). Both call `requireAdmin()`.
  - Learner `src/app/(public)/learn/[slug]/watch/[lessonId]/page.tsx` (server-rendered shell; the player is a client island). The course page `learn/[slug]` shows lessons from `listLessons` instead of `Course.modules`.
  - Admin users page: add a small "Course access" control (grant by course, list, revoke), following the page's existing pattern.

### UI (tokens from `globals.css` only; check 375px and desktop)
- `src/components/learn/video-player.tsx` rewrite. Keep the control chrome; replace the mock with a real `<video>`.
  - `<video playsInline preload="metadata" controlsList="nodownload" disablePictureInPicture>` plus `onContextMenu={(e) => e.preventDefault()}`: deterrents only.
  - **Fullscreen fullscreens the wrapper `div`** (video + watermark), never the `<video>` itself, or the watermark disappears. Where `div.requestFullscreen` is missing (iOS Safari), hide the fullscreen button and stay inline.
  - **Watermark** (`src/components/learn/watermark.tsx`, small and separately testable): the `watermarkId` text, about 30 to 35% opacity, soft text shadow so it reads on light and dark scenes, `pointer-events: none`, `aria-hidden`. It **drifts continuously across the whole video area** (a CSS `transform` animation, no per-frame JavaScript): a random path from edge to edge taking 20 to 40 seconds, then a new random path. Random start point on every load. A **second, fainter copy** (about 15% opacity) runs half a cycle behind on a different path, so covering one still leaves the other. With `prefers-reduced-motion`, no animation: the text jumps to a random position every 10 to 15 seconds instead. Cycle length and the jump interval are props, so tests can shorten them. Shown only when `watermarkId` is not null (previews have none). Tune size and opacity on a real lecture so it does not distract.
  - **Learner notice:** a one-line note under the player for logged-in viewers: "Lessons are watermarked with your learner ID." The wording is data (a constant in `src/config/`, DRAFT until the client and a lawyer confirm it; add to open-questions). The learner's own code is also shown in their account area (`(learner)/my-self`, following that page's pattern) as "Your learner ID", read through `auth.getWatermarkId`, so the notice means something.
  - **URL refresh:** a timer fires at `expiresAt` minus 5 minutes, and also on a `<video>` error or a failed seek: call `getPlaybackAction`, set the new `src`, restore `currentTime`, resume if it was playing. After 2 failed refreshes show the "Could not load, try again" state.
  - **Progress:** every 15 s while playing, and on pause, `ended` and `pagehide` (use `sendBeacon`-safe action call or a normal call), call `saveProgressAction`. Not for previews.
  - States: loading, playing, error, `login_required` (prompt to log in, return to this lesson using the same-site path check), `not_entitled` ("This lesson is part of the course" with a link to the course page), `unavailable`, `rate_limited`.
- `src/components/admin/lesson-uploader.tsx` (client island): pick a file, check `type === "video/mp4"` and size, read the duration from a local `<video>` element using an object URL, call `startVideoUploadAction`, `PUT` with `XMLHttpRequest` (progress event drives a progress bar), then `completeVideoUploadAction`. Retry button restarts from zero. Shows the "not fast-start" warning badge when `fastStart === false`.

## Rules and invariants that apply
- **Signed + expiring and checked against entitlements** (CLAUDE.md). The playback URL is only ever produced by `getPlayback` after the access check. No URL is stored in the database or in the page HTML.
- **Access rule in one place (`playback.ts`):** lesson not published or no ready current video → `not_found`/`unavailable`. `is_preview` → allowed without login. Otherwise no session → `login_required` (D83); no active entitlement → `not_entitled`. Always `requireUser()`-style: a guest account (D80) counts as logged out.
- **Ownership:** progress is read and written only for the session's own user id; the id never comes from the client.
- **Zod at every boundary:** `lessonId`/`videoId` are UUIDs; `sizeBytes` is an integer from 1 byte up to **2 GB** (`2_147_483_648`); `durationSec` is an integer from 1 to **14,400** (4 h); `positionSec` is an integer from 0 up; `contentType` is exactly `video/mp4`; `title` 1 to 120 characters; `courseSlug` must exist in `courses.ts`.
- **No PII in logs or analytics.** The watermark id is not logged and not sent to analytics. Log ids (`lessonId`, `videoId`), never names, phones or the signed URL. Analytics uses the learner's random user id as `sessionId`.
- **Rate limits** (shared `createLimiter`): anonymous preview URL 30 per hour per IP; logged-in playback URL 60 per hour per user; progress saves 10 per minute per user; admin actions need no extra limit beyond `requireAdmin()`. These are per process (see `limiter.ts`), enough to stop a script, not a billing guard.
- Error responses are fixed codes (`ActionResult`), never stack traces or S3 messages.
- Modules talk only through `service.ts`. Catalog calls `commerce.hasAccess` and `auth.getWatermarkId`; commerce and auth never call catalog.

## Behaviour details

**Upload (admin).**
1. `startVideoUpload`: lesson must exist; validate size; insert `videos` row (`uploading`, `declared_size_bytes`, `provider`); call `video.createUpload`; save `provider_ref`; return `{ videoId, uploadUrl }`.
2. Browser `PUT`s the file to `uploadUrl`.
3. `completeVideoUpload`: load the row (must be `uploading`); `video.markReady(providerRef)`. Not found, empty, or `sizeBytes !== declared_size_bytes` → set `failed`, return a code. OK → in **one transaction, locking the lesson row**: set the video `ready` with `size_bytes`, `fast_start`, `duration_sec`, `ready_at`; if the lesson had a current video, set that video's `replaced_at = now()`; set `lessons.current_video_id` to the new video. After commit, enqueue `video.purge` for the old video with `delaySec: 86400` and `singletonKey: "purge:<oldVideoId>"`. A failed upload never changes the current video.
4. `fast_start === false` is saved and shown as a warning; it never blocks (D96).

**Replace.** Same flow on a lesson that already has a video. The lesson keeps its `id`, progress and entitlements. The new video becomes current at completion; the old one is purged 24 hours later so people mid-watch finish.

**Purge job.** `video.purge` payload `{ videoId }`: load the row; if missing, or `replaced_at` is null (it is current again), return. Else `video.remove(providerRef)`, then delete the row. Idempotent; the queue retries on a throw.

**Publish.** `setPublished(true)` needs a `ready` current video, else `{ ok: false, code: "no_video" }`. Unpublishing is always allowed. A learner holding a URL keeps playing until it expires (accepted).

**Reorder.** `moveLesson` swaps with the neighbour in a transaction, then renumbers the course's lessons 1..n so positions never have gaps or ties. A move past the end is a no-op `ok`.

**Playback.** `getPlayback`: access rule → rate limit (before touching the video adapter) → `video.getPlayback({ providerRef, expiresInSec: 7200 })` → `resumeSec` for logged-in users from `lesson_progress`: 0 if none or if `positionSec >= duration - 5`, else `min(positionSec, duration)`. Previews return `resumeSec: 0`. Fires `preview_played { courseId }` for an anonymous preview (anonymous id supplied by the client as a random UUID kept in `localStorage`, validated as a UUID).

**Progress.** `saveProgress`: access check (same rule, preview lessons need a login to save, but anonymous previews never call it), clamp `positionSec` to `[0, duration]`, upsert. `completed_at` is set the first time `positionSec >= 0.9 * duration` and is never cleared. Fires `lesson_completed { courseId, lessonId }` only on that first transition. After a replace with a shorter video, a saved position beyond the new length resumes at 0 (see Playback); the completed flag stays.

**Watermark id.** Lazy: `getWatermarkId` runs inside `getPlayback` for a logged-in user. Never exposed in any list or API except the player's own response.

**Dev data.** `scripts/seed.ts` additionally creates `lessons` from the static `COURSES` modules (flattened in order, title and `preview` flag kept, `minutes` becomes `duration_sec`), all published, each with one `ready` fake video, and grants the seeded admin/test learner access to every course. `public/sample/lecture.mp4`: a small (under 2 MB), fast-start clip made with `ffmpeg -f lavfi -i testsrc=duration=20:size=1280x720:rate=30 -f lavfi -i sine=duration=20 -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart public/sample/lecture.mp4`, committed. Document the command in `scripts/` or the README so it can be regenerated.

## Edge cases
- Same signed URL shared with someone else: works until it expires. Accepted (D40); the watermark identifies the account.
- Anonymous preview scripted for bandwidth: IP limit, plus the clip is a free preview. Per-process limiter, so it does not cap total spend; the budget alert (Phase B) is the backstop.
- Upload `PUT` fails, tab closed, or file is not the declared size: row stays `uploading` or becomes `failed`; the lesson keeps its old video; admin retries. Orphan rows and objects are a follow-up sweep.
- Two admins complete uploads for one lesson: the lesson row lock serialises them; the later one wins, the earlier one becomes `replaced` and is purged.
- Admin replaces the video while a learner watches: the learner's URL still works for 24 h (purge delay), longer than the 2 h URL life.
- Entitlement revoked or lesson unpublished mid-watch: playback continues until the URL expires, then the refresh returns `not_entitled` or `not_found`, and the player shows that state.
- Progress save from a learner without access, or for a lesson that is not published: refused with the same codes.
- User deleted: progress and entitlements cascade. Video rows and files are not tied to users.
- `courses.ts` slug removed after lessons exist: `listLessons` for that slug is simply not shown; no cascade (documented, courses will move to the database).
- iOS Safari: inline playback with the watermark, no fullscreen button.
- Clock skew: the refresh timer uses `expiresAt` from the server minus a 5-minute margin; the first refresh failure retries once before showing the error.
- Browser `error` on a not-fast-start file: it still plays after the metadata fetch (slower start); the admin warning is the fix.

## Verification (end to end)

**Unit tests (Vitest, no database):**
- `mp4.test.ts`: `isFastStart` is `true` for `ftyp,moov,mdat`; `false` for `ftyp,mdat,moov`; handles a 64-bit box size and a `free` box before `moov`; returns `null` when neither box is in the bytes; never reads past the end on a truncated box.
- `playback.test.ts` (access rule as a pure function): preview + no user → ok; paid + no user → `login_required`; paid + no entitlement → `not_entitled`; entitled → ok; unpublished or no ready video → `not_found`/`unavailable`.
- Progress rules (pure): clamp to duration; 90% marks complete once and never unmarks; resume is 0 within 5 s of the end; resume after a replace with a shorter video.
- Reorder renumbering (pure): up/down/at the ends, gap-free result.
- Watermark id: format, alphabet, no ambiguous characters.
- Fake adapter contract: `markReady` size mismatch path; `remove` idempotent.

**Integration tests (`*.int.test.ts`, test database, `npm run db:test:setup`):**
- `startVideoUpload` → `completeVideoUpload` happy path; size mismatch → `failed` and the old video stays current.
- Replace: old video gets `replaced_at`, `video.purge` is enqueued once with a 24 h delay; running the handler deletes the row and calls `remove`; running it twice is safe; running it for a video that became current again does nothing.
- Concurrent `completeVideoUpload` on one lesson ends with exactly one current video.
- `setPublished(true)` with no ready video refused.
- Entitlement: grant twice is one row; revoke then `hasAccess` false; grant after revoke works (partial unique index).
- `getPlayback` end to end with a real DB: all `PlaybackResult` codes; `getWatermarkId` returns the same code on a second call and creates exactly one; rate limit trips.
- Progress: ownership (user A cannot write user B's row); `lesson_completed` event fires once.
- Admin actions refuse a non-admin and a logged-out caller.

**Playwright (375px mobile and desktop):**
1. Admin logs in, opens a course, creates a lesson, uploads the sample file through the fake endpoint: progress bar completes, status `ready`, publish works.
2. Learner without access opens a paid lesson → "part of the course" state; logged out opens a preview lesson → plays, no watermark; logged out opens a paid lesson → login prompt that returns to the lesson.
3. Learner with access plays: the watermark text is visible (`XXXX-XXXX` pattern), its position differs between two samples a couple of seconds apart (shorten the cycle via the prop), the fainter second copy exists, and with reduced motion emulated it jumps instead of drifting. The notice line shows, and "Your learner ID" on the account page matches the watermark text. Then seek, reload and resume near the saved position (within 15 s).
4. Replace the video in admin, reload the learner page: it plays and the lesson's progress is intact.
5. No horizontal scroll at 375px; controls are reachable by touch.

**Commands:** `nvm use && npm run db:generate && npm run lint && npm run typecheck && npm run test` (+ `npm run test:e2e` for the Playwright path).

**Analytics events that must fire (no PII):** `preview_played { courseId }` (anonymous preview), `lesson_completed { courseId, lessonId }` (first completion only). No `watermarkId`, no URL, no name or phone in any event or log line.

## Phase B: AWS adapter and setup (after the account exists)
- **Packages:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/cloudfront-signer`. Add to `package.json` only in this phase and list them in `integrations.md` 2.3. The `video.purge` job calls the adapter, so the worker needs them too: add them to the `Dockerfile` worker dependency list (the gotcha in `integrations.md`).
- **Env (validated in `src/lib/env-schema.ts`, secrets never `NEXT_PUBLIC_*`, dummy values in `.env.example`):** `VIDEO_PROVIDER=s3`, `AWS_REGION=ap-south-1`, `VIDEO_BUCKET`, `VIDEO_CDN_BASE_URL` (default CloudFront domain until the client picks one), `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`. Required in production when `VIDEO_PROVIDER=s3`. Register `s3` in `pickAdapter` for `video`.
- **`s3.ts`:** keys `videos/<videoId>.mp4`; `createUpload` = presigned PUT, 1 hour, signing `Content-Type` and `Content-Length`; `markReady` = `HeadObject` for size, then a ranged `GetObject` of the first 64 KB (up to 1 MB if `isFastStart` returns `null`) to compute `fastStart`; `getPlayback` = CloudFront signed URL on `VIDEO_CDN_BASE_URL/<providerRef>` with `dateLessThan = now + expiresInSec`; `remove` = `DeleteObject` (no error if missing).
- **Infra checklist (one AWS account, dev and prod buckets and keys, Mumbai):** private bucket with versioning; CORS allowing `PUT` from the app origins, exposing `ETag`; CloudFront distribution with origin access control to the bucket, trusted key group for signed URLs, caching and `Range` requests allowed for `.mp4`; IAM role for the app and worker limited to `PutObject`, `GetObject`, `DeleteObject`, `HeadObject` on the bucket; budget alerts at 50 / 80 / 100%; Secrets Manager for the private key. No Glacier rule (D95).
- **Verification:** upload one real client MP4 through the admin page into the dev bucket; confirm it plays through the CloudFront signed URL on a phone over mobile data; confirm an expired URL gets a 403 and the player refreshes; confirm a non-fast-start file shows the warning; confirm replace purges the old object after the delay (use `delaySec` override in a test).

## Open items
- Video file spec still to be confirmed by the client (see open-questions): H.264/AAC, bitrate, fast-start, poster, mapping sheet.
- Free previews without login: client has not confirmed (D66).
- Final domain: the CDN base URL is an env var until then (no cookies are needed for MP4).
