"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Check,
  ChevronRight,
  CirclePlay,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Infinity as InfinityIcon,
  Layers,
  Lock,
  Play,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, ProgressBar, Rating } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { getCareer } from "@/lib/data/careers";
import { allLessons, getCourse, type Course, type ResourceType } from "@/lib/data/courses";
import { cn, formatCompact, formatMinutes, formatPrice } from "@/lib/format";
import { computeResults, isDiscoveryComplete } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";
import { CheckoutModal } from "./checkout-modal";
import { VideoPlayer } from "./video-player";

const RESOURCE_ICON: Record<ResourceType, LucideIcon> = {
  PDF: FileText,
  Template: FileSpreadsheet,
  Dataset: Database,
  Worksheet: FileText,
  Code: Layers,
};

export function CourseExperience({ slug }: { slug: string }) {
  const course = getCourse(slug) as Course;
  const state = useAppState();
  const toast = useToast();
  const lessons = useMemo(() => allLessons(course), [course]);
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [checkout, setCheckout] = useState(false);
  const [tab, setTab] = useState<"overview" | "resources">("overview");
  const playerRef = useRef<HTMLDivElement>(null);

  const owned = state.purchases.includes(slug);
  const done = state.progress[slug] ?? [];
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const index = lessons.indexOf(lesson);
  const moduleIndex = course.modules.findIndex((m) => m.lessons.includes(lesson));
  const lessonInModule = course.modules[moduleIndex].lessons.indexOf(lesson);
  const locked = !owned && !lesson.preview;
  const nextIncomplete = lessons.find((l) => !done.includes(l.id));
  const pct = done.length / lessons.length;

  const results = useMemo(
    () => (state.completedAt && isDiscoveryComplete(state) ? computeResults(state) : null),
    [state],
  );
  const rec = results?.courses.find((c) => c.course.slug === slug);
  const matchedCareers = new Set(results?.matches.map((m) => m.career.id));

  const select = (id: string) => {
    setLessonId(id);
    const el = playerRef.current;
    if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onComplete = useCallback(() => {
    if (owned) actions.completeLesson(slug, lesson.id);
  }, [owned, slug, lesson.id]);

  const purchaseCard = (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80">
      {owned ? (
        <>
          <div className="flex items-center justify-between">
            <Badge tone="green">
              <BadgeCheck className="size-3.5" aria-hidden /> Enrolled
            </Badge>
            <span className="text-sm font-bold text-ink">{Math.round(pct * 100)}%</span>
          </div>
          <ProgressBar value={pct} tone="green" className="mt-4 h-2" />
          <p className="mt-2 text-xs text-slate-500">
            {done.length} of {lessons.length} lessons complete
          </p>
          {nextIncomplete ? (
            <Button className="mt-5 w-full" onClick={() => select(nextIncomplete.id)}>
              <Play className="size-4 fill-current" aria-hidden />
              <span className="truncate">Continue: {nextIncomplete.title}</span>
            </Button>
          ) : (
            <div className="mt-5 rounded-2xl bg-linear-to-br from-sun-100 to-brand-50 p-4 text-center">
              <Trophy className="mx-auto size-8 text-sun-500" aria-hidden />
              <p className="mt-2 font-bold text-ink">Course complete!</p>
              <Button
                size="sm"
                variant="dark"
                className="mt-3"
                onClick={() => toast("Certificate downloaded", `${course.title} — certificate of completion (demo).`)}
              >
                <Download className="size-4" aria-hidden /> Download certificate
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-ink">{formatPrice(course.price)}</span>
            <span className="text-lg text-slate-400 line-through">{formatPrice(course.listPrice)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            {Math.round((1 - course.price / course.listPrice) * 100)}% off · launch pricing
          </p>
          <Button size="lg" className="mt-5 w-full" onClick={() => setCheckout(true)}>
            <Lock className="size-4" aria-hidden /> Enrol now
          </Button>
          <Button
            variant="secondary"
            className="mt-2.5 w-full"
            onClick={() => select(lessons.find((l) => l.preview)!.id)}
          >
            <CirclePlay className="size-4" aria-hidden /> Watch free preview
          </Button>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
            {[
              { icon: Clock, t: `${course.hours} hours of on-demand video` },
              { icon: Layers, t: `${lessons.length} lessons across ${course.modules.length} modules` },
              { icon: Download, t: `${course.resources.length} downloadable resources` },
              { icon: Award, t: "Certificate of completion" },
              { icon: InfinityIcon, t: "Lifetime access" },
            ].map((x) => (
              <li key={x.t} className="flex items-center gap-2.5">
                <x.icon className="size-4 text-slate-400" aria-hidden /> {x.t}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            7-day refund · Demo checkout, no real payment
          </p>
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-slate-200/70">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: `linear-gradient(120deg, ${course.theme.from}, ${course.theme.to})` }}
        />
        <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/learn" className="hover:text-brand-700">
              Level 1 Learning
            </Link>
            <ChevronRight className="size-4" aria-hidden />
            <span className="text-ink">{course.category}</span>
          </nav>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand">Level 1 · Self-paced</Badge>
            <Badge tone="slate">{course.level}</Badge>
            {rec && (
              <Badge tone="sun">
                <Sparkles className="size-3" aria-hidden /> Recommended for you · {rec.fit}% match
              </Badge>
            )}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">{course.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">{course.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
            <Rating value={course.rating} reviews={course.reviews} />
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden /> {formatCompact(course.learners)} learners
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {course.hours} hours
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-4" aria-hidden /> {lessons.length} lessons
            </span>
            <span className="inline-flex items-center gap-2">
              <Avatar initials={course.instructor.initials} className="size-7 text-[11px]" />
              {course.instructor.name}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:py-10">
        <div className="min-w-0">
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
              onPreview={() => select(lessons.find((l) => l.preview)!.id)}
            />
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                {course.modules[moduleIndex].title} · {formatMinutes(lesson.minutes)}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-ink">{lesson.title}</h2>
            </div>
            <div className="flex gap-2">
              {owned &&
                (done.includes(lesson.id) ? (
                  <Badge tone="green" className="h-9 px-3.5">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden /> Completed
                  </Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => actions.completeLesson(slug, lesson.id)}>
                    <Check className="size-4" aria-hidden /> Mark complete
                  </Button>
                ))}
              {index < lessons.length - 1 && (
                <Button size="sm" variant="ghost" onClick={() => select(lessons[index + 1].id)}>
                  Next <ChevronRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 lg:hidden">{purchaseCard}</div>

          {/* Tabs */}
          <div className="mt-8 flex gap-1 border-b border-slate-200" role="tablist">
            {(["overview", "resources"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-3 text-sm font-semibold capitalize transition",
                  tab === t ? "border-brand-600 text-ink" : "border-transparent text-slate-500 hover:text-ink",
                )}
              >
                {t}
                {t === "resources" && (
                  <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                    {course.resources.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="space-y-10 py-8">
              <p className="text-[15px] leading-relaxed text-slate-600">{course.description}</p>
              <div>
                <h3 className="text-lg font-bold text-ink">What you&apos;ll learn</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.outcomes.map((o) => (
                    <li
                      key={o}
                      className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200/80"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Skills you&apos;ll build</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.skills.map((s) => (
                    <span key={s} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Careers this prepares you for</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.careers.map((id) => {
                    const c = getCareer(id);
                    if (!c) return null;
                    const match = matchedCareers.has(id);
                    return (
                      <span
                        key={id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1",
                          match ? "bg-sun-100 text-sun-700 ring-sun-200" : "bg-white text-slate-600 ring-slate-200",
                        )}
                      >
                        {match && <Sparkles className="size-3.5" aria-hidden />}
                        {c.title}
                      </span>
                    );
                  })}
                </div>
                {results && (
                  <p className="mt-2 text-xs text-slate-400">Highlighted roles appear in your career report.</p>
                )}
              </div>
              <div className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-slate-200/80">
                <Avatar initials={course.instructor.initials} className="size-14 text-base" />
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Your instructor</p>
                  <p className="mt-1 font-bold text-ink">{course.instructor.name}</p>
                  <p className="text-sm text-brand-700">{course.instructor.role}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{course.instructor.bio}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8">
              {!owned && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sun-100 px-4 py-3 text-sm text-sun-700">
                  <Lock className="size-4 shrink-0" aria-hidden /> Resources unlock when you enrol in the full course.
                </div>
              )}
              <ul className="divide-y divide-slate-100 rounded-3xl bg-white ring-1 ring-slate-200/80">
                {course.resources.map((r) => {
                  const Icon = RESOURCE_ICON[r.type];
                  return (
                    <li key={r.id} className="flex items-center gap-4 p-4">
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-xl",
                          owned ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-semibold", owned ? "text-ink" : "text-slate-500")}>{r.title}</p>
                        <p className="text-xs text-slate-400">
                          {r.type} · {r.size}
                        </p>
                      </div>
                      {owned ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toast("Download started", `${r.title} (demo file)`)}
                        >
                          <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
                        </Button>
                      ) : (
                        <Lock className="size-4 text-slate-300" aria-label="Locked" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">{purchaseCard}</div>
          <div className="rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="font-bold text-ink">Course content</p>
              <p className="text-xs text-slate-500">
                {lessons.length} lessons · {course.hours} hrs
              </p>
            </div>
            <div className="max-h-[560px] scrollbar-thin overflow-y-auto p-2">
              {course.modules.map((m, mi) => (
                <div key={m.id} className="py-2">
                  <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Module {mi + 1} · {m.title}
                  </p>
                  {m.lessons.map((l) => {
                    const isCurrent = l.id === lesson.id;
                    const isDone = owned && done.includes(l.id);
                    const isLocked = !owned && !l.preview;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => select(l.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                          isCurrent ? "bg-brand-50" : "hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full",
                            isDone
                              ? "bg-emerald-500 text-white"
                              : isCurrent
                                ? "bg-brand-600 text-white"
                                : isLocked
                                  ? "bg-slate-100 text-slate-400"
                                  : "bg-brand-50 text-brand-600",
                          )}
                        >
                          {isDone ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : isLocked ? (
                            <Lock className="size-3" />
                          ) : (
                            <Play className="ml-0.5 size-3 fill-current" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              isCurrent ? "font-semibold text-ink" : isLocked ? "text-slate-500" : "text-slate-700",
                            )}
                          >
                            {l.title}
                          </span>
                          <span className="flex items-center gap-2 text-[11px] text-slate-400">
                            {formatMinutes(l.minutes)}
                            {l.preview && !owned && (
                              <span className="font-semibold text-emerald-600">Free preview</span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} slugs={[slug]} />
    </div>
  );
}
