"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Play, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Eyebrow, ProgressBar } from "@/components/ui/misc";
import { allLessons, getCourse, type Course } from "@/modules/catalog/courses";
import { isDiscoveryComplete } from "@/modules/chat/scoring";
import { useAppState, useHydrated } from "@/lib/store";
import { CourseThumb } from "./course-thumb";

export function MyLearning() {
  const state = useAppState();
  const hydrated = useHydrated();
  const courses = state.purchases.map(getCourse).filter((c): c is Course => !!c);
  const totalDone = courses.reduce((n, c) => n + (state.progress[c.slug]?.length ?? 0), 0);
  const totalLessons = courses.reduce((n, c) => n + allLessons(c).length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>My learning</Eyebrow>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink">
            {state.profile.name ? `Welcome back, ${state.profile.name}` : "Your courses"}
          </h1>
          <p className="mt-2 text-slate-600">Pick up right where you left off.</p>
        </div>
        {hydrated && courses.length > 0 && (
          <div className="flex gap-3">
            <Stat label="Courses" value={courses.length} />
            <Stat label="Lessons done" value={`${totalDone}/${totalLessons}`} />
          </div>
        )}
      </div>

      {!hydrated ? (
        <div className="mt-10 h-48 animate-pulse rounded-3xl bg-slate-100" />
      ) : courses.length === 0 ? (
        <div className="mt-10 rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <BookOpen className="size-7" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-ink">No courses yet</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            {state.completedAt && isDiscoveryComplete(state)
              ? "Your career report has a learning path ready for you."
              : "Discover your path first, and we'll recommend the right Level 1 courses."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/discover">
              <Sparkles className="size-4" aria-hidden />
              {state.completedAt ? "View my learning path" : "Start career discovery"}
            </ButtonLink>
            <ButtonLink href="/learn" variant="secondary">
              Browse courses
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {courses.map((c) => {
            const lessons = allLessons(c);
            const done = state.progress[c.slug] ?? [];
            const next = lessons.find((l) => !done.includes(l.id));
            const pct = done.length / lessons.length;
            return (
              <Link
                key={c.slug}
                href={`/learn/${c.slug}`}
                className="group flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:p-5"
              >
                <CourseThumb
                  slug={c.slug}
                  className="aspect-video w-full shrink-0 rounded-2xl sm:aspect-auto sm:h-28 sm:w-48"
                  iconClassName="size-12"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="slate">{c.category}</Badge>
                    {pct === 1 && <Badge tone="green">Completed</Badge>}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-ink group-hover:text-brand-700">{c.title}</h2>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {next ? `Up next: ${next.title}` : "All lessons complete — grab your certificate"}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={pct} tone="green" className="max-w-sm" />
                    <span className="text-xs font-semibold text-slate-500">{Math.round(pct * 100)}%</span>
                  </div>
                </div>
                <span className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-glow">
                  {done.length ? (
                    <Play className="size-4 fill-current" aria-hidden />
                  ) : (
                    <ArrowRight className="size-4" aria-hidden />
                  )}
                  {done.length ? "Continue" : "Start"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-3 ring-1 ring-slate-200/80">
      <p className="text-xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
