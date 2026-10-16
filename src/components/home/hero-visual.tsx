import { BadgeCheck, CirclePlay, Sparkles } from "lucide-react";
import { RadarChart } from "@/components/charts/radar-chart";
import { CourseThumb } from "@/components/learn/course-thumb";
import { ProgressBar, SageAvatar } from "@/components/ui/misc";

const DEMO_SCORES = { R: 34, I: 88, A: 76, S: 62, E: 48, C: 55 };

/** Floating product snapshots for the hero — pure markup, no data dependencies. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto h-[480px] w-full max-w-[540px] sm:h-[540px]">
      <div className="absolute inset-8 rounded-full bg-linear-to-br from-brand-300/50 via-fuchsia-300/30 to-sun-300/40 blur-3xl" />

      {/* Chat snapshot */}
      <div className="animate-float absolute left-0 top-2 w-[80%] rounded-3xl bg-white/95 p-4 shadow-lift ring-1 ring-slate-200/70 backdrop-blur sm:w-[72%] sm:p-5">
        <div className="flex items-center gap-2.5">
          <SageAvatar size="sm" />
          <div>
            <p className="text-sm font-bold text-ink">Sage</p>
            <p className="flex items-center gap-1 text-[11px] text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" /> AI career guide
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 text-[13px] leading-snug text-slate-700">
          Which of these spark your curiosity, Aarav? Pick up to 4.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Data & analytics", "Design", "Psychology", "Startups"].map((c, i) => (
            <span
              key={c}
              className={
                i < 2
                  ? "rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white"
                  : "rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200"
              }
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Profile snapshot */}
      <div className="animate-float-slow absolute right-0 top-[30%] w-[58%] rounded-3xl bg-white p-4 shadow-lift ring-1 ring-slate-200/70 sm:w-[50%]">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">Your career profile</p>
        <p className="mt-1 font-serif text-xl italic leading-tight text-ink sm:text-2xl">The Creative Analyst</p>
        <RadarChart scores={DEMO_SCORES} showLabels={false} interactive={false} size={180} className="mt-1" />
        <div className="flex justify-center gap-1.5">
          {["I", "A", "S"].map((d) => (
            <span key={d} className="grid size-6 place-items-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Match pill */}
      <div className="animate-float absolute left-[4%] top-[47%] hidden items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift sm:flex [animation-delay:-2s]">
        <span className="grid size-9 place-items-center rounded-xl bg-white/10">
          <Sparkles className="size-4 text-sun-300" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] text-white/60">Top match</p>
          <p className="text-sm font-semibold">UX / Product Designer · 94%</p>
        </div>
      </div>

      {/* Course snapshot */}
      <div className="absolute bottom-0 left-[6%] w-[66%] overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-slate-200/70 sm:w-[56%]">
        <CourseThumb slug="data-analytics-foundations" className="h-24" iconClassName="size-10 bottom-3 right-3">
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            <CirclePlay className="size-3" aria-hidden /> Level 1 · Self-paced
          </span>
        </CourseThumb>
        <div className="p-4">
          <p className="text-sm font-bold text-ink">Data Analytics Foundations</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="size-3.5 text-emerald-500" aria-hidden /> 5 of 12 lessons
            </span>
            <span>42%</span>
          </div>
          <ProgressBar value={0.42} className="mt-1.5" tone="green" />
        </div>
      </div>
    </div>
  );
}
