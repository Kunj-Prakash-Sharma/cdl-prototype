"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CirclePlay, Lock, Search, Sparkles, Target, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Eyebrow, SageAvatar } from "@/components/ui/misc";
import { CATEGORIES, COURSES, type CourseCategory } from "@/lib/data/courses";
import { cn } from "@/lib/format";
import { computeResults, isDiscoveryComplete } from "@/lib/scoring";
import { useAppState, useHydrated } from "@/lib/store";
import { CourseCard } from "./course-card";

type Sort = "popular" | "rating" | "price";

export function CourseCatalog() {
  const state = useAppState();
  const hydrated = useHydrated();
  const [category, setCategory] = useState<CourseCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");

  const results = useMemo(
    () => (state.completedAt && isDiscoveryComplete(state) ? computeResults(state) : null),
    [state],
  );

  const courses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = COURSES.filter(
      (c) =>
        (category === "All" || c.category === category) &&
        (!q || [c.title, c.tagline, c.instructor.name, ...c.skills].some((s) => s.toLowerCase().includes(q))),
    );
    const sorters: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      popular: (a, b) => b.learners - a.learners,
      rating: (a, b) => b.rating - a.rating,
      price: (a, b) => a.price - b.price,
    };
    return [...list].sort(sorters[sort]);
  }, [category, query, sort]);

  const totalHours = COURSES.reduce((n, c) => n + c.hours, 0);

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-slate-200/70">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="absolute -top-32 right-0 h-80 w-[640px] rounded-full bg-linear-to-l from-brand-200/50 to-sun-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Badge tone="white" className="shadow-soft">
            <CirclePlay className="size-3.5 text-brand-600" aria-hidden /> Level 1 · Self-paced learning
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">
            Learn the skills your <span className="font-serif font-normal italic text-gradient">future self</span> needs.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Expert-led video courses with hands-on projects and downloadable resources. Preview any course for free —
            unlock everything when you enrol.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { k: `${COURSES.length}`, v: "career-focused courses" },
              { k: `${totalHours}+ hrs`, v: "of video lessons" },
              { k: "2 free", v: "preview lessons per course" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-2xl font-extrabold text-ink">{s.k}</dt>
                <dd className="text-sm text-slate-500">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Personalisation */}
        {hydrated &&
          (results ? (
            <section className="mb-14 rounded-[32px] bg-linear-to-br from-brand-50 via-white to-sun-100/60 p-6 ring-1 ring-brand-100 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <Eyebrow className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5" aria-hidden /> Recommended for you
                  </Eyebrow>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {results.name}, your path to {results.matches[0].career.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Based on your career profile — <span className="font-semibold">{results.archetype.title}</span>
                  </p>
                </div>
                <ButtonLink href="/discover" variant="secondary" size="sm">
                  View my report <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {results.courses.map(({ course, career, fit }) => (
                  <CourseCard key={course.slug} slug={course.slug} match={fit} reason={`For ${career.title}`} />
                ))}
              </div>
            </section>
          ) : (
            <section className="mb-14 flex flex-col items-start gap-5 rounded-[28px] bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-8">
              <SageAvatar size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">Not sure where to start?</h2>
                <p className="mt-1 text-sm text-white/65">
                  Take the free 12-minute AI career discovery and get a learning path built around your strengths.
                </p>
              </div>
              <ButtonLink href="/discover" variant="light">
                Discover my path <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </section>
          ))}

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                  category === c ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-ink hover:ring-slate-300",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex h-10 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-400 lg:w-64 lg:flex-none">
              <Search className="size-4 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses or skills"
                aria-label="Search courses"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort courses"
              className="h-10 rounded-full bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 outline-none"
            >
              <option value="popular">Most popular</option>
              <option value="rating">Highest rated</option>
              <option value="price">Price: low to high</option>
            </select>
          </div>
        </div>

        <motion.div layout className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {courses.map((c) => (
              <motion.div
                key={c.slug}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                <CourseCard slug={c.slug} className="h-full" />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {courses.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center">
            <p className="font-semibold text-ink">No courses match “{query}”</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); }} className="mt-2 text-sm font-semibold text-brand-700">
              Clear filters
            </button>
          </div>
        )}

        {/* Phase 2 teaser */}
        <section className="mt-20 grid gap-4 md:grid-cols-2">
          {[
            { icon: Users, level: "Level 2", title: "Live cohort learning", body: "Instructor-led cohorts with peers, projects and feedback." },
            { icon: Target, level: "Level 3", title: "One-to-one mentoring", body: "Personal sessions with industry mentors." },
          ].map((l) => (
            <div key={l.level} className="flex items-center gap-4 rounded-3xl border border-dashed border-slate-300 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <l.icon className="size-5" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400">{l.level}</p>
                <p className="font-bold text-slate-600">{l.title}</p>
                <p className="text-sm text-slate-500">{l.body}</p>
              </div>
              <span className="hidden sm:block">
                <Badge tone="slate">
                  <Lock className="size-3" aria-hidden /> Phase 2
                </Badge>
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
