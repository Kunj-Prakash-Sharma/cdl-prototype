"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Lock,
  Play,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { allLessons, getCourse, type Course, type ResourceType } from "@/modules/catalog/courses";
import { cn, formatMinutes, formatPrice } from "@/lib/format";
import { actions, useAppState, useHydrated } from "@/lib/store";
import { CheckoutModal } from "./checkout-modal";
import { VideoPlayer } from "./video-player";

const RESOURCE_ICON: Record<ResourceType, LucideIcon> = {
  PDF: FileText,
  Template: FileSpreadsheet,
  Dataset: Database,
  Worksheet: FileText,
  Code: Layers,
};

/**
 * V5 course page (row 9) on the sample catalog (D92). Purchases and progress still live in this browser's demo store
 * until `catalog`, `commerce` and `video` exist.
 */
export function CourseExperience({ slug }: { slug: string }) {
  const course = getCourse(slug) as Course;
  const state = useAppState();
  const toast = useToast();
  const lessons = useMemo(() => allLessons(course), [course]);
  // null until the learner picks a lesson; until then the page shows the default lesson below.
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [tab, setTab] = useState<"overview" | "resources">("overview");
  const playerRef = useRef<HTMLDivElement>(null);

  // The demo store lives in localStorage, so wait for it before showing price or progress (no flash of the wrong state).
  const hydrated = useHydrated();
  const owned = state.purchases.includes(slug);
  const done = state.progress[slug] ?? [];

  // An owned course opens on the first lesson not yet done (My Learning's "Resume" lands here); otherwise lesson 1.
  const resumeLesson = (owned && lessons.find((l) => !done.includes(l.id))) || lessons[0];
  const lesson = lessons.find((l) => l.id === lessonId) ?? resumeLesson;
  const index = lessons.indexOf(lesson);
  const moduleIndex = course.modules.findIndex((m) => m.lessons.includes(lesson));
  const lessonInModule = course.modules[moduleIndex].lessons.indexOf(lesson);
  const locked = !owned && !lesson.preview;
  const pct = done.length / lessons.length;
  const firstPreview = lessons.find((l) => l.preview) ?? lessons[0];

  const words = course.title.split(" ");
  const titleHead = words.slice(0, -1).join(" ");
  const titleTail = words[words.length - 1];

  const select = (id: string) => {
    setLessonId(id);
    const el = playerRef.current;
    if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onComplete = useCallback(() => {
    if (!owned) return;
    setLessonId(lesson.id); // pin it, so completing the default lesson does not jump the player to the next one
    actions.completeLesson(slug, lesson.id);
  }, [owned, slug, lesson.id]);

  const unlockButton = (
    <Button onClick={() => setCheckout(true)} className="shrink-0">
      Unlock full course
    </Button>
  );

  return (
    <div>
      {/* Course header */}
      <section className="bg-paper">
        <div className="mx-auto flex max-w-295 flex-wrap items-end justify-between gap-x-10 gap-y-5 px-4.5 pt-[clamp(22px,3vw,34px)] sm:px-6">
          <div className="min-w-0 flex-[1_1_300px]">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <Link href="/learn" className="underline-offset-2 hover:text-brand-600 hover:underline">
                Courses
              </Link>{" "}
              / <span>{course.category}</span>
            </nav>
            <h1 className="mt-2.5 mb-1.5 font-display text-[clamp(30px,3.7vw,48px)] leading-[1.08] font-normal tracking-[-1.5px] text-ink">
              {titleHead} <span className="text-brand-600">{titleTail}</span>
            </h1>
            <p className="text-[15px] text-muted">
              {lessons.length} lessons · {course.hours} hrs · {course.level} · Video course, watch anytime
            </p>
          </div>

          {!hydrated ? null : owned ? (
            <div className="w-full max-w-95 min-w-60 flex-[0_1_380px]">
              <div className="mb-2 flex justify-between text-sm font-bold text-ink">
                <span>Course progress</span>
                <span>
                  {done.length}/{lessons.length} lessons · {Math.round(pct * 100)}%
                </span>
              </div>
              <ProgressBar value={pct} tone="brand" aria-label="Course progress" />
            </div>
          ) : (
            // Phones get the sticky bar at the bottom instead.
            <div className="hidden flex-wrap items-center justify-end gap-x-3.5 gap-y-2.5 md:flex">
              <span className="font-display text-[32px] leading-none font-medium tracking-[-0.5px] text-ink">
                {formatPrice(course.price)}
              </span>
              <span className="text-[15px] text-muted line-through">{formatPrice(course.listPrice)}</span>
              {unlockButton}
            </div>
          )}
        </div>
      </section>

      <main
        className={cn("mx-auto max-w-295 px-4.5 pt-[clamp(20px,2.4vw,28px)] pb-16 sm:px-6", !owned && "pb-32 md:pb-16")}
      >
        <div className="grid items-start gap-[clamp(24px,2.4vw,32px)] lg:grid-cols-[minmax(0,2.1fr)_minmax(300px,1fr)]">
          {/* Player and tabs */}
          <div className="flex min-w-0 flex-col gap-4.5">
            <div ref={playerRef} className="scroll-mt-20">
              <VideoPlayer
                key={lesson.id}
                course={course}
                lesson={lesson}
                label={`Module ${moduleIndex + 1} · Lesson ${lessonInModule + 1}`}
                locked={locked}
                hasNext={index < lessons.length - 1}
                onComplete={onComplete}
                onNext={() => select(lessons[index + 1].id)}
                onUnlock={() => setCheckout(true)}
                onPreview={() => select(firstPreview.id)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => select(lessons[index - 1].id)}
                  className="shadow-soft sm:text-base"
                >
                  ← Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={index === lessons.length - 1}
                  onClick={() => select(lessons[index + 1].id)}
                  className="shadow-soft sm:text-base"
                >
                  Next →
                </Button>
              </div>
              {owned &&
                (done.includes(lesson.id) ? (
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-success-50 px-4 text-sm font-bold text-success sm:text-base">
                    <Check className="size-4" strokeWidth={3} aria-hidden /> Completed
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setLessonId(lesson.id);
                      actions.completeLesson(slug, lesson.id);
                    }}
                    className="shadow-soft sm:text-base"
                  >
                    <Check className="size-4" aria-hidden /> Mark complete
                  </Button>
                ))}
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Course sections" className="mt-2.5 flex gap-9 border-b border-line-strong">
              {(["overview", "resources"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls={tab === t ? `panel-${t}` : undefined}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px min-h-11 cursor-pointer border-b-3 px-2 pt-4 pb-3.5 text-[17px] font-bold capitalize transition-colors",
                    tab === t ? "border-brand-600 text-ink" : "border-transparent text-muted hover:text-brand-600",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <div
                role="tabpanel"
                id="panel-overview"
                aria-labelledby="tab-overview"
                className="grid items-start gap-8 pt-3.5 md:grid-cols-[minmax(0,1.75fr)_minmax(240px,1fr)]"
              >
                <div>
                  <h2 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-ink">About this course</h2>
                  <p className="mt-3.5 text-[17px] leading-relaxed text-body">{course.description}</p>
                  <h3 className="mt-8.5 text-lg font-bold tracking-[-0.01em] text-ink">What you&apos;ll learn</h3>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {course.outcomes.map((o) => (
                      <li key={o} className="flex items-start gap-3 text-base leading-normal text-body sm:text-[17px]">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl border border-line bg-white px-5 py-5.5">
                    <p className="text-[13px] font-bold tracking-[1.2px] text-muted uppercase">
                      Skills you&apos;ll build
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-brand-100 px-3.5 py-2 text-sm font-semibold text-brand-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-line bg-white px-5 py-5.5 text-base leading-[1.9] text-body">
                    <b className="text-ink">Tip:</b> press <Key>←</Key> / <Key>→</Key> on the progress bar to skip 5
                    seconds.
                  </div>
                </div>
              </div>
            ) : (
              <div
                role="tabpanel"
                id="panel-resources"
                aria-labelledby="tab-resources"
                className="flex flex-col gap-3 pt-5"
              >
                {!owned && (
                  <p className="flex items-center gap-3 rounded-2xl bg-sun-100 px-4 py-3 text-sm font-semibold text-sun-700">
                    <Lock className="size-4 shrink-0" aria-hidden /> Resources unlock with the full course.
                  </p>
                )}
                {course.resources.map((r) => {
                  const Icon = RESOURCE_ICON[r.type];
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 rounded-[20px] border border-line bg-white px-5 py-4"
                    >
                      <span
                        aria-hidden
                        className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold text-ink">{r.title}</span>
                        <span className="block text-sm text-muted">
                          {r.type} · {r.size}
                        </span>
                      </span>
                      {owned ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Download ${r.title}`}
                          onClick={() => toast("Download started", r.title)}
                        >
                          <Download className="size-4" aria-hidden />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      ) : (
                        <Lock className="size-4 shrink-0 text-muted" aria-label="Locked" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Course content */}
          <aside aria-label="Course content" className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[28px] border border-line bg-white pb-2.5">
              <div className="flex items-baseline justify-between gap-2.5 px-6 pt-5 pb-2.5">
                <p className="font-display text-[22px] font-medium text-ink">Course content</p>
                <span className="text-sm font-bold text-muted">
                  {owned ? `${done.length}/${lessons.length} done` : `${lessons.length} lessons`}
                </span>
              </div>
              <div className="scrollbar-thin lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
                {course.modules.map((m) => {
                  const modDone = m.lessons.filter((l) => done.includes(l.id)).length;
                  return (
                    <div key={m.id} className="px-2.5">
                      <p className="flex justify-between gap-2.5 px-3.5 pt-3.5 pb-1.5 text-[13px] font-bold tracking-[1.2px] text-muted uppercase">
                        <span>{m.title}</span>
                        <span>{owned ? `${modDone}/${m.lessons.length}` : m.lessons.length}</span>
                      </p>
                      {m.lessons.map((l) => {
                        const n = lessons.indexOf(l) + 1;
                        const isCurrent = l.id === lesson.id;
                        const isDone = owned && done.includes(l.id);
                        const isLocked = !owned && !l.preview;
                        const sub = isLocked
                          ? "Locked"
                          : isCurrent
                            ? "Now playing"
                            : l.preview && !owned
                              ? "Free preview"
                              : isDone
                                ? "Completed"
                                : null;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => select(l.id)}
                            aria-current={isCurrent ? "true" : undefined}
                            className={cn(
                              "flex w-full cursor-pointer items-start gap-3.5 rounded-2xl px-3.5 py-3.25 text-left transition-colors hover:bg-brand-50",
                              isCurrent && "bg-brand-100 hover:bg-brand-100",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "grid size-8.5 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                                isDone
                                  ? "bg-brand-600 text-white"
                                  : isCurrent && !isLocked
                                    ? "bg-brand-950 text-sun-400"
                                    : isLocked
                                      ? "bg-mist text-muted"
                                      : "border border-line-strong bg-white text-body",
                              )}
                            >
                              {isDone ? (
                                <Check className="size-4" strokeWidth={3} />
                              ) : isCurrent && !isLocked ? (
                                <Play className="ml-0.5 size-3.5 fill-current" />
                              ) : isLocked ? (
                                <Lock className="size-3.5" />
                              ) : (
                                n
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] leading-[1.35] font-semibold text-ink">{l.title}</span>
                              <span className="mt-0.5 block text-[13px] text-muted">
                                {formatMinutes(l.minutes)}
                                {sub && ` · ${sub}`}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Phones: the purchase card becomes a sticky bottom bar (design-system mobile rule). */}
      {hydrated && !owned && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4.5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <span className="mr-auto flex flex-col leading-tight">
              <span className="text-[13px] text-muted line-through">{formatPrice(course.listPrice)}</span>
              <span className="font-display text-[22px] font-medium text-ink">{formatPrice(course.price)}</span>
            </span>
            {unlockButton}
          </div>
        </div>
      )}

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} slugs={[slug]} />
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-block min-w-6 rounded-md border-[1.5px] border-line-strong bg-white px-1.25 text-center align-[1px] font-sans text-[13px] leading-5">
      {children}
    </kbd>
  );
}
