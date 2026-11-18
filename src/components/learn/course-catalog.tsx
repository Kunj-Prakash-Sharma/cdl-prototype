"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Lock, Search, Sparkles, Target, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, SageAvatar } from "@/components/ui/misc";
import { CATEGORIES, COURSES, type CourseCategory } from "@/modules/catalog/courses";
import { cn } from "@/lib/format";
import { computeResults, isDiscoveryComplete } from "@/modules/chat/legacy/scoring";
import { useAppState, useHydrated } from "@/lib/store";
import { CourseCard } from "./course-card";

export function CourseCatalog() {
  const state = useAppState();
  const hydrated = useHydrated();
  const [category, setCategory] = useState<CourseCategory | "All">("All");
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => (state.completedAt && isDiscoveryComplete(state) ? computeResults(state) : null),
    [state],
  );

  const courses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COURSES.filter(
      (c) =>
        (category === "All" || c.category === category) &&
        (!q || [c.title, c.tagline, c.category, ...c.skills].some((s) => s.toLowerCase().includes(q))),
    );
  }, [category, query]);

  return (
    <div>
      {/* Header */}
      <section className="hero-glow border-b border-line">
        <div className="mx-auto max-w-7xl px-4.5 py-12 sm:px-6 sm:py-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-2 text-sm font-semibold text-brand-700">
            <i className="size-1.75 rounded-full bg-brand-600" aria-hidden /> Self-paced · First topic free
          </span>
          <h1 className="mt-4.5 font-display text-[clamp(34px,4.6vw,56px)] leading-[1.1] font-normal tracking-[-1px] text-ink">
            Courses that get you <span className="text-brand-600">picked.</span>
          </h1>
          <p className="mt-2.5 max-w-155 text-base leading-relaxed text-body">
            Your knowledge gets you started. Your skills help you stand out. Short, self-paced courses for the moments
            that actually matter.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4.5 pt-9 pb-16 sm:px-6">
          {/* Personalisation */}
          {hydrated &&
            (results ? (
              <div className="mb-12 rounded-[22px] border border-brand-200 bg-brand-50 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <Eyebrow className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5" aria-hidden /> Recommended for you
                    </Eyebrow>
                    <h2 className="mt-2 font-display text-2xl font-normal tracking-[-0.5px] text-ink sm:text-3xl">
                      {results.name}, your path to {results.matches[0].career.title}
                    </h2>
                    <p className="mt-1 text-sm text-body">
                      Based on your career profile — <span className="font-semibold">{results.archetype.title}</span>
                    </p>
                  </div>
                  <ButtonLink href="/discover" variant="secondary" size="sm">
                    View my report <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
                <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4.5">
                  {results.courses.map(({ course, career }) => (
                    <CourseCard
                      key={course.slug}
                      slug={course.slug}
                      reason={`For ${career.title}`}
                      className="h-full"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-12 flex flex-col items-start gap-5 rounded-[22px] bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-8">
                <SageAvatar size="lg" />
                <div className="flex-1">
                  <h2 className="font-display text-xl font-normal">Not sure where to start?</h2>
                  <p className="mt-1 text-sm text-white/70">
                    Take the free career discovery and get a learning path built around your strengths.
                  </p>
                </div>
                <ButtonLink href="/discover" variant="light">
                  Discover my path <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            ))}

          {/* Filters */}
          <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4.5">
            <div role="group" aria-label="Filter courses" className="flex flex-wrap gap-2">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors duration-200",
                    category === c
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line-strong bg-white text-ink hover:border-brand-600",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="relative block min-w-65 flex-1 sm:w-85 sm:flex-none">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses"
                aria-label="Search courses"
                className="min-h-12 w-full min-w-0 rounded-[14px] border-[1.5px] border-line bg-paper py-3 pr-4 pl-10 text-[15px] text-ink transition-[border-color,box-shadow] outline-none placeholder:text-muted focus:border-brand-600 focus:shadow-focus"
              />
            </label>
          </div>

          <p className="mb-4.5 text-sm text-muted" aria-live="polite">
            {courses.length} {courses.length === 1 ? "course" : "courses"}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4.5">
            {courses.map((c) => (
              <CourseCard key={c.slug} slug={c.slug} className="h-full" />
            ))}
          </div>
          {courses.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-line-strong py-14 text-center">
              <p className="font-semibold text-ink">
                No courses match that search. Try another word or clear the filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
                className="mt-1 min-h-11 cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-800"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Phase 2 teaser */}
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Users,
                level: "Level 2",
                title: "Live cohort learning",
                body: "Instructor-led cohorts with peers, projects and feedback.",
              },
              {
                icon: Target,
                level: "Level 3",
                title: "One-to-one mentoring",
                body: "Personal sessions with industry mentors.",
              },
            ].map((l) => (
              <div
                key={l.level}
                className="flex items-center gap-4 rounded-[20px] border border-dashed border-line-strong p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mist text-muted">
                  <l.icon className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted">{l.level}</p>
                  <p className="font-bold text-ink">{l.title}</p>
                  <p className="text-sm text-muted">{l.body}</p>
                </div>
                <span className="hidden items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-muted sm:inline-flex">
                  <Lock className="size-3" aria-hidden /> Phase 2
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
