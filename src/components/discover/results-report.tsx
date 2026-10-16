"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  Download,
  Lock,
  RotateCcw,
  Share2,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { RadarChart } from "@/components/charts/radar-chart";
import { CheckoutModal } from "@/components/learn/checkout-modal";
import { CourseCard } from "@/components/learn/course-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Eyebrow } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { bundlePrice, lessonCount } from "@/lib/data/courses";
import { DIMENSION_INFO, GOALS, optionLabel } from "@/lib/data/discovery";
import { cn, formatPrice } from "@/lib/format";
import { computeResults } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.21, 0.6, 0.35, 1] as const },
});

export function ResultsReport() {
  const state = useAppState();
  const r = useMemo(() => computeResults(state), [state]);
  const toast = useToast();
  const [checkout, setCheckout] = useState(false);
  const [confirmRetake, setConfirmRetake] = useState(false);

  const top = r.matches[0];
  const pathCourses = r.courses.map((c) => c.course);
  const unowned = pathCourses.filter((c) => !state.purchases.includes(c.slug));
  const { total: unownedTotal, price: bundled } = bundlePrice(unowned);
  const bundle = { price: unowned.length > 1 ? bundled : unownedTotal };
  const pathHours = unowned.reduce((n, c) => n + c.hours, 0);
  const pathLessons = unowned.reduce((n, c) => n + lessonCount(c), 0);
  const date = state.completedAt
    ? new Date(state.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* ---------- Hero ---------- */}
      <motion.section {...fade()} className="relative overflow-hidden rounded-[32px] bg-ink p-6 text-white sm:p-10">
        <div className="absolute inset-0 bg-linear-to-br from-brand-700/70 via-brand-950/20 to-sun-600/25" />
        <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">
              Career report · {r.name}
              {date && <span className="text-white/40"> · {date}</span>}
            </p>
            <h1 className="mt-4 font-serif text-5xl italic leading-[1.05] sm:text-6xl">{r.archetype.title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/75">{r.archetype.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/50">Holland code</span>
              {r.code.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/15">
                  <span className="font-extrabold">{d}</span>
                  <span className="text-white/70">{DIMENSION_INFO[d].name}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Target, label: "Top match", value: `${top.fit}%`, sub: top.career.title },
              { icon: Zap, label: "Aptitude", value: `${r.aptitude.correct}/${r.aptitude.total}`, sub: r.aptitude.percentile },
              { icon: Trophy, label: "Top value", value: r.values[0]?.label ?? "—", sub: "What drives you" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 backdrop-blur sm:p-4">
                <s.icon className="size-4 text-sun-300" aria-hidden />
                <p className="mt-3 text-[11px] text-white/50">{s.label}</p>
                <p className="mt-0.5 truncate text-lg font-bold sm:text-xl">{s.value}</p>
                <p className="truncate text-[11px] text-white/60">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-6 print:hidden">
          <Button variant="light" size="sm" onClick={() => document.getElementById("learning-path")?.scrollIntoView({ behavior: "smooth" })}>
            <Sparkles className="size-4 text-brand-600" aria-hidden /> See my learning path
          </Button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/80 ring-1 ring-white/20 transition hover:bg-white/10"
          >
            <Download className="size-4" aria-hidden /> Save as PDF
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).catch(() => {});
              toast("Link copied", "Share your report with a parent, mentor or friend (demo).");
            }}
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/80 ring-1 ring-white/20 transition hover:bg-white/10"
          >
            <Share2 className="size-4" aria-hidden /> Share
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmRetake) actions.restartDiscovery();
              else {
                setConfirmRetake(true);
                setTimeout(() => setConfirmRetake(false), 3500);
              }
            }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition sm:ml-auto",
              confirmRetake ? "bg-sun-500 text-white" : "text-white/60 hover:text-white",
            )}
          >
            <RotateCcw className="size-4" aria-hidden /> {confirmRetake ? "Click again to retake" : "Retake"}
          </button>
        </div>
      </motion.section>

      {/* ---------- Assessment summaries ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <motion.section {...fade(0.1)} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 shadow-soft lg:col-span-5">
          <CardHeader title="Interest profile" subtitle="Holland RIASEC · hover a point for detail" />
          <RadarChart scores={r.scores} highlight={r.ranked[0]} className="mt-2" />
          <ul className="mt-4 space-y-2.5">
            {r.code.map((d, i) => (
              <li key={d} className="flex items-start gap-3 rounded-2xl bg-paper p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">{d}</span>
                <div className="min-w-0">
                  <p className="flex justify-between gap-3 text-sm font-semibold text-ink">
                    <span>
                      {DIMENSION_INFO[d].name} <span className="font-normal text-slate-400">· {DIMENSION_INFO[d].alias}</span>
                    </span>
                    <span className="font-bold tabular-nums">{r.scores[d]}</span>
                  </p>
                  {i === 0 && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{DIMENSION_INFO[d].summary}</p>}
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        <div className="grid gap-6 lg:col-span-7 lg:grid-cols-2">
          <motion.section {...fade(0.15)} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 shadow-soft">
            <CardHeader title="Aptitude" subtitle="6-question reasoning quiz" />
            <div className="mt-5 flex items-end gap-3">
              <p className="text-6xl font-extrabold leading-none tracking-tight text-ink">
                {r.aptitude.correct}
                <span className="text-2xl font-bold text-slate-300">/{r.aptitude.total}</span>
              </p>
              <Badge tone="green" className="mb-1">
                <TrendingUp className="size-3" aria-hidden /> {r.aptitude.percentile}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-400">vs. learners at your stage (demo benchmark)</p>
            <ul className="mt-6 space-y-4">
              {r.aptitude.bySkill.map((s) => (
                <li key={s.skill}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.label}</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {s.correct}/{s.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100" title={`${s.label}: ${s.pct}%`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.9, delay: 0.3 }}
                      className="h-full rounded-full bg-brand-600"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section {...fade(0.2)} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 shadow-soft">
            <CardHeader title="Work values" subtitle="What you want from your work" />
            <ol className="mt-5 space-y-3">
              {r.values.map((v, i) => (
                <li key={v.id} className="flex items-center gap-3">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", i === 0 ? "bg-brand-600 text-white shadow-glow" : "bg-brand-50 text-brand-700")}>
                    <v.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      <span className="mr-1.5 text-slate-300">#{i + 1}</span>
                      {v.label}
                    </p>
                    <p className="text-xs text-slate-500">{v.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-2xl bg-paper p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your goal</p>
              <p className="mt-1 text-sm font-semibold text-ink">{optionLabel(GOALS, state.profile.goal)}</p>
            </div>
          </motion.section>
        </div>
      </div>

      {/* ---------- Career matches ---------- */}
      <motion.section {...fade(0.25)} className="mt-16">
        <SectionTitle eyebrow="Career matches" title="Careers that fit you best" subtitle="Ranked by how well each role matches your interests, aptitude and values." />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {r.matches.slice(0, 3).map((m, i) => (
            <article
              key={m.career.id}
              className={cn(
                "relative flex flex-col rounded-3xl bg-white p-6 ring-1 shadow-soft transition hover:-translate-y-1 hover:shadow-lift",
                i === 0 ? "ring-2 ring-brand-500" : "ring-slate-200/80",
              )}
            >
              {i === 0 && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-glow">
                  Best match
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">{m.career.family}</p>
                  <h3 className="mt-1 text-xl font-bold leading-tight text-ink">{m.career.title}</h3>
                </div>
                <FitRing value={m.fit} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{m.career.blurb}</p>
              <ul className="mt-4 space-y-2">
                {m.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden />
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {m.career.skills.map((s) => (
                  <span key={s} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div className="mt-1">
                  <p className="flex items-center gap-1 text-slate-400">
                    <Wallet className="size-3.5" aria-hidden /> Typical salary
                  </p>
                  <p className="mt-0.5 font-semibold text-ink">{m.career.salary}</p>
                </div>
                <div className="mt-1">
                  <p className="flex items-center gap-1 text-slate-400">
                    <TrendingUp className="size-3.5" aria-hidden /> Outlook
                  </p>
                  <p className="mt-0.5 font-semibold text-ink">{m.career.outlook}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 sm:p-6">
          <p className="text-sm font-bold text-ink">Also worth exploring</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {r.matches.slice(3).map((m) => (
              <div key={m.career.id} className="flex items-center gap-4 rounded-2xl bg-paper p-4">
                <Briefcase className="size-5 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{m.career.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${m.fit}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums text-ink">{m.fit}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ---------- Strengths & development ---------- */}
      <motion.section {...fade(0.3)} className="mt-16 grid gap-6 md:grid-cols-2">
        <InsightCard
          icon={BadgeCheck}
          tone="green"
          title="Your strengths"
          subtitle="What you naturally bring to the table"
          items={r.strengths}
        />
        <InsightCard
          icon={Sprout}
          tone="sun"
          title="Development areas"
          subtitle="Where focused practice will pay off most"
          items={r.growth}
        />
      </motion.section>

      {/* ---------- Learning path ---------- */}
      <section id="learning-path" className="mt-16 scroll-mt-36">
        <div className="relative overflow-hidden rounded-[32px] bg-linear-to-br from-brand-50 via-white to-sun-100/60 p-6 ring-1 ring-brand-100 sm:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionTitle
              eyebrow="Recommended next step · Level 1"
              title={`Your learning path to ${top.career.title}`}
              subtitle="Self-paced courses chosen for your profile. Preview any lesson free — unlock the full path when you're ready."
            />
            <div className="shrink-0 rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 shadow-soft lg:w-80 print:hidden">
              {unowned.length === 0 ? (
                <>
                  <Badge tone="green">
                    <Check className="size-3" strokeWidth={3} aria-hidden /> Path unlocked
                  </Badge>
                  <p className="mt-3 text-sm text-slate-600">You own every course on this path. Keep the momentum going!</p>
                  <ButtonLink href="/my-learning" className="mt-4 w-full">
                    Continue learning <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-500">
                    {unowned.length > 1 ? `${unowned.length} courses` : "1 course"} · {pathHours} hrs · {pathLessons} lessons
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-ink">{formatPrice(bundle.price)}</span>
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(unowned.reduce((n, c) => n + c.listPrice, 0))}
                    </span>
                  </div>
                  {unowned.length > 1 && <p className="mt-1 text-xs font-semibold text-emerald-600">Launch pricing + extra 30% bundle discount</p>}
                  <Button className="mt-4 w-full" onClick={() => setCheckout(true)}>
                    <Lock className="size-4" aria-hidden /> Unlock my learning path
                  </Button>
                  <Link href="/learn" className="mt-3 block text-center text-xs font-semibold text-slate-500 hover:text-brand-700">
                    Or browse all Level 1 courses
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {r.courses.map(({ course, career, fit }, i) => (
              <div key={course.slug} className="relative">
                <span className="absolute -left-2 -top-2 z-10 grid size-8 place-items-center rounded-full bg-ink text-sm font-bold text-white ring-4 ring-white">
                  {i + 1}
                </span>
                <CourseCard slug={course.slug} match={fit} reason={`Builds skills for ${career.title}`} className="h-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- What's next ---------- */}
      <section className="mt-16">
        <SectionTitle eyebrow="Your roadmap" title="What happens next" />
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { icon: Check, title: "Career discovery", body: "Profile, strengths and matches — done!", state: "done" },
            { icon: Sparkles, title: "Level 1 · Self-paced", body: "Build core skills with your recommended courses.", state: "now" },
            { icon: Users, title: "Level 2 · Live cohorts", body: "Learn with peers and instructors in real time.", state: "soon" },
            { icon: Target, title: "Level 3 · 1:1 mentoring", body: "Personal guidance from industry mentors.", state: "soon" },
          ].map((s) => (
            <li
              key={s.title}
              className={cn(
                "rounded-3xl p-5",
                s.state === "now" && "bg-white ring-2 ring-brand-500 shadow-soft",
                s.state === "done" && "bg-white ring-1 ring-slate-200/80",
                s.state === "soon" && "border border-dashed border-slate-300 bg-transparent",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl",
                    s.state === "done" && "bg-emerald-500 text-white",
                    s.state === "now" && "bg-brand-600 text-white",
                    s.state === "soon" && "bg-slate-100 text-slate-400",
                  )}
                >
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", s.state === "now" ? "text-brand-600" : s.state === "done" ? "text-emerald-600" : "text-slate-400")}>
                  {s.state === "done" ? "Complete" : s.state === "now" ? "Up next" : "Phase 2"}
                </span>
              </div>
              <p className={cn("mt-4 font-bold", s.state === "soon" ? "text-slate-500" : "text-ink")}>{s.title}</p>
              <p className="mt-1 text-sm text-slate-500">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} slugs={unowned.map((c) => c.slug)} />
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  );
}

function FitRing({ value }: { value: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e6e3ff" strokeWidth="5" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="#5a45f2"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - value / 100) }}
          transition={{ duration: 1, delay: 0.4 }}
        />
      </svg>
      <span className="text-sm font-extrabold text-ink">{value}%</span>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tone,
  title,
  subtitle,
  items,
}: {
  icon: typeof BadgeCheck;
  tone: "green" | "sun";
  title: string;
  subtitle: string;
  items: { title: string; detail: string; source?: string }[];
}) {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 shadow-soft sm:p-7">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-11 place-items-center rounded-2xl", tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-sun-100 text-sun-600")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {items.map((it, i) => (
          <li key={it.title} className="flex gap-4">
            <span className={cn("mt-0.5 text-sm font-extrabold tabular-nums", tone === "green" ? "text-emerald-500" : "text-sun-500")}>0{i + 1}</span>
            <div>
              <p className="font-semibold text-ink">
                {it.title}
                {it.source && <span className="ml-2 align-middle text-[11px] font-medium text-slate-400">{it.source}</span>}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{it.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
