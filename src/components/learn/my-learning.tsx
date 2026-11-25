"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { allLessons, COURSES, getCourse, type Course } from "@/modules/catalog/courses";
import { useAppState, useHydrated } from "@/lib/store";
import { CourseCard } from "./course-card";

/** How many not-owned courses the "More courses" section shows. */
const MORE_LIMIT = 4;

/**
 * V5 My Learning (row 10) on the sample catalog (D92). Purchases and progress still come from this browser's demo
 * store until `commerce` (entitlements) and lesson progress exist. `report` is the server-rendered report card.
 */
export function MyLearning({ report }: { report?: ReactNode }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const courses = state.purchases.map(getCourse).filter((c): c is Course => !!c);
  const more = COURSES.filter((c) => !state.purchases.includes(c.slug)).slice(0, MORE_LIMIT);

  // "Continue learning": the first course that is started but not finished.
  const progressOf = (c: Course) => {
    const lessons = allLessons(c);
    const done = state.progress[c.slug] ?? [];
    return { lessons, done, next: lessons.findIndex((l) => !done.includes(l.id)) };
  };
  const ongoing = courses.map((c) => ({ course: c, ...progressOf(c) })).find((p) => p.done.length > 0 && p.next !== -1);

  return (
    <div>
      <section className="hero-glow border-b border-line">
        <div className="mx-auto max-w-7xl px-4.5 pt-14 pb-11 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-2 text-sm font-semibold text-brand-700">
            <i className="size-1.75 rounded-full bg-brand-600" aria-hidden /> My Learning
          </span>
          <h1 className="mt-4.5 font-display text-[clamp(34px,4.6vw,56px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
            Your courses, <span className="text-brand-600">all in one place.</span>
          </h1>

          {hydrated && ongoing && (
            <div className="mt-6.5 flex max-w-215 flex-wrap items-center gap-x-7 gap-y-4 rounded-[20px] border border-line bg-white px-5.5 py-4.5">
              <div className="min-w-55 flex-1">
                <p className="text-xs font-bold tracking-[1.4px] text-brand-600 uppercase">Continue learning</p>
                <p className="mt-1 mb-0.5 font-display text-2xl text-ink">{ongoing.course.title}</p>
                <p className="text-sm text-muted">
                  Lesson {ongoing.next + 1} of {ongoing.lessons.length} · pick up where you left off
                </p>
              </div>
              <div className="min-w-50 flex-1">
                <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-muted">
                  <span>
                    {ongoing.done.length} of {ongoing.lessons.length} lessons
                  </span>
                  <span>{Math.round((ongoing.done.length / ongoing.lessons.length) * 100)}%</span>
                </div>
                <ProgressBar
                  value={ongoing.done.length / ongoing.lessons.length}
                  aria-label={`${ongoing.course.title} progress`}
                />
              </div>
              <ButtonLink href={`/learn/${ongoing.course.slug}`}>Resume</ButtonLink>
            </div>
          )}

          {report && <div className="mt-4">{report}</div>}
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4.5 pt-12 pb-14 sm:px-6">
          <h2 className="mb-5.5 font-display text-[clamp(26px,3vw,36px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
            Enrolled courses
          </h2>
          {!hydrated ? (
            <div className="h-48 animate-pulse rounded-[20px] bg-mist" aria-busy="true" />
          ) : courses.length === 0 ? (
            <div className="max-w-155 rounded-[20px] border border-line bg-paper p-8">
              <p className="mb-1.5 font-display text-[26px] text-ink">Nothing here yet</p>
              <p className="mb-4.5 text-base leading-relaxed text-body">
                Courses you buy appear here with every lesson unlocked. Each course lets you preview its first lessons
                for free.
              </p>
              <ButtonLink href="/learn">Browse courses</ButtonLink>
            </div>
          ) : (
            <div className="grid gap-4.5 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
              {courses.map((c) => (
                <CourseCard key={c.slug} slug={c.slug} />
              ))}
            </div>
          )}
        </div>
      </section>

      {hydrated && more.length > 0 && (
        <section className="border-b border-line bg-paper">
          <div className="mx-auto max-w-7xl px-4.5 pt-14 pb-16 sm:px-6">
            <div className="mb-5.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4.5">
              <div>
                <p className="text-[13px] font-bold tracking-[1.4px] text-brand-600 uppercase">Keep going</p>
                <h2 className="mt-2 font-display text-[clamp(26px,3vw,36px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
                  More courses to explore
                </h2>
              </div>
              <ButtonLink href="/learn" variant="secondary" size="sm">
                See all courses
              </ButtonLink>
            </div>
            <div className="grid gap-4.5 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
              {more.map((c) => (
                <CourseCard key={c.slug} slug={c.slug} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
