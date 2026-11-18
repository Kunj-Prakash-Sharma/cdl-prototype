import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { HelplineLink } from "@/components/discover/helpline-link";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/format";
import type { LatestReport } from "@/modules/chat/service";
import { CourseLink, PrintButton, ReportLink } from "./report-actions";

// The free report, drawn from the data `getLatestReport` returns (E5-S1), in the V5 look (D81). All wording that belongs
// to the report (cards, interest names, career families, notes, footer) comes from the report data (report-copy.ts);
// only page chrome lives here.
//
// BACKEND GAPS (D82, open-questions.md), not built here: the persona title and tagline ("The Curious Thinker"), the
// combined "Strengths" and "Areas to grow" scores, the next-step course price/image/lesson count, and the named career
// coach. They need `chat` report data and client-approved wording first. Plain-language scale ends ("Reserved" to
// "Outgoing") also wait for wording.

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const isoDay = (iso: string) => iso.slice(0, 10);

// Colour per interest type and trait: tokens only. Full class names so Tailwind can see them.
const TYPE_BG: Record<string, string> = {
  R: "bg-sun-600",
  I: "bg-brand-600",
  A: "bg-brand-400",
  S: "bg-teal",
  E: "bg-sun-500",
  C: "bg-brand-900",
};
const TRAIT_BG: Record<string, string> = {
  O: "bg-brand-600",
  C: "bg-teal",
  E: "bg-sun-500",
  A: "bg-success",
  N: "bg-brand-400",
};
const RADAR_ORDER = ["R", "I", "A", "S", "E", "C"] as const;
const SECTION_LINKS = [
  ["rp-pers", "Personality"],
  ["rp-int", "Interests"],
  ["rp-crs", "Courses"],
] as const;

function Section({
  id,
  testId,
  number,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  testId?: string;
  number: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-24 rounded-[28px] border border-line bg-white p-6 sm:p-9 lg:p-11 print:break-inside-avoid"
    >
      <div className="mb-6 max-w-3xl sm:mb-8">
        <p className="flex items-center gap-2.5 text-[13px] font-bold tracking-[1.2px] text-brand-600 uppercase">
          <span className="inline-flex h-6 min-w-[30px] items-center justify-center rounded-full bg-brand-100 px-1.5 text-xs tracking-normal">
            {number}
          </span>
          {eyebrow}
        </p>
        <h2
          id={`${id}-h`}
          className="mt-2.5 font-display text-[26px] leading-[1.15] font-normal tracking-[-0.8px] text-ink sm:text-4xl"
        >
          {title}
        </h2>
        {lead && <p className="mt-2 text-[15px] leading-[1.6] text-body">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function Letter({ letter, bg, size = "md" }: { letter: string; bg: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center font-display font-semibold text-white [print-color-adjust:exact]",
        bg,
        size === "sm" && "size-8 rounded-[10px] text-[15px]",
        size === "md" && "size-[38px] rounded-xl text-lg",
        size === "lg" && "size-[52px] rounded-2xl text-[26px] shadow-lift",
      )}
    >
      {letter}
    </span>
  );
}

/** Radar of the six interest scores, drawn on the server (no script). The list beside it carries the same numbers. */
function Radar({ scores }: { scores: Record<string, number> }) {
  const point = (i: number, r: number) => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    return [150 + r * Math.cos(angle), 150 + r * Math.sin(angle)] as const;
  };
  const fmt = (p: readonly [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const ring = (r: number) => RADAR_ORDER.map((_, i) => fmt(point(i, r))).join(" ");
  const shape = RADAR_ORDER.map((t, i) => fmt(point(i, (110 * Math.max(4, scores[t] ?? 0)) / 100))).join(" ");
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Radar chart of your six interest scores"
        className="size-full overflow-visible"
      >
        {[36, 73, 110].map((r) => (
          <polygon key={r} points={ring(r)} fill="none" className="stroke-line-strong" strokeWidth="1" />
        ))}
        <polygon
          points={shape}
          className="fill-brand-600/15 stroke-brand-600"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      {RADAR_ORDER.map((t, i) => {
        const [x, y] = point(i, 138);
        return (
          <span
            key={t}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-body sm:text-xs"
            style={{ left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%` }}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}

export function ReportView({ report, children }: { report: LatestReport; children?: ReactNode }) {
  const next = report.courses[0];
  const scoreByType = Object.fromEntries(report.interests.map((i) => [i.type, i.score]));
  return (
    <div
      className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[18px] py-8 sm:px-6 sm:py-10 lg:gap-6 lg:px-12"
      data-testid="report"
    >
      {/* Hero */}
      <header className="relative grid gap-6 overflow-hidden rounded-[28px] bg-linear-to-br from-brand-900 to-brand-700 p-6 text-white [print-color-adjust:exact] sm:rounded-[32px] sm:p-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-10 lg:p-12 print:bg-none print:text-ink print:ring-1 print:ring-line">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold print:bg-brand-100">
            <span className="size-[7px] rounded-full bg-sun-400" aria-hidden="true" />
            Finished on {dayFormat.format(new Date(report.completedAt))}
          </p>
          {report.draft && (
            <span
              data-testid="report-draft"
              className="ml-2 inline-block rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-semibold text-sun-700"
            >
              Draft wording
            </span>
          )}
          <p className="mt-5 text-[13px] font-bold tracking-[1.3px] text-sun-400 uppercase print:text-sun-700">
            Your career report
          </p>
          <h1 className="mt-1.5 font-display text-[34px] leading-[1.05] font-normal tracking-[-1.5px] sm:text-5xl lg:text-[58px]">
            What you enjoy, and <span className="text-sun-400 print:text-brand-600">where it can lead</span>
          </h1>
          {!report.flat && report.hollandLetters.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex gap-2" aria-label={`Interest code ${report.hollandLetters.join("")}`}>
                {report.hollandLetters.map((type) => (
                  <Letter key={type} letter={type} bg={TYPE_BG[type]} size="lg" />
                ))}
              </div>
              <p className="text-[13px] leading-normal text-brand-200 print:text-muted">
                Your interest code
                <br />
                <b className="text-[15px] font-bold text-white print:text-ink">
                  {report.areas.map((a) => a.name).join(" · ")}
                </b>
              </p>
            </div>
          )}
          <div className="mt-7 flex flex-wrap gap-2 print:hidden">
            <PrintButton fileTitle={`Career report ${isoDay(report.completedAt)}`} />
            <ReportLink href="#callback" action="callback" variant="light" testId="report-callback-button">
              Request a callback
            </ReportLink>
          </div>
        </div>

        {next && (
          <div className="rounded-3xl bg-white/95 p-5 text-ink shadow-glow sm:p-6 print:hidden">
            <p className="text-xs font-bold tracking-[1.2px] text-muted uppercase">Your next step</p>
            <p className="mt-3 font-display text-[22px] leading-tight font-medium tracking-[-0.3px]">{next.title}</p>
            <p className="mt-1.5 text-sm leading-[1.55] text-body">{next.tagline}</p>
            <ButtonLink
              href={`/learn/${next.slug}`}
              size="sm"
              className="mt-4 w-full"
              aria-label={`Open course: ${next.title}`}
            >
              View the course
            </ButtonLink>
          </div>
        )}
      </header>

      {/* Jump links */}
      <nav
        aria-label="Report sections"
        className="sticky top-3 z-10 flex flex-wrap justify-center gap-1 self-center rounded-[20px] border border-line bg-white/90 p-1.5 shadow-lift backdrop-blur-md sm:rounded-full print:hidden"
      >
        {SECTION_LINKS.map(([id, label], i) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold text-ink hover:bg-brand-100 hover:text-brand-700 sm:text-sm"
          >
            <span className="text-[11px] text-brand-600">0{i + 1}</span>
            {label}
          </a>
        ))}
      </nav>

      {/* 01 Personality */}
      <Section
        id="rp-pers"
        testId="report-traits"
        number="01"
        eyebrow="Personality"
        title="How you tend to be"
        lead="Five core traits. Neither end of a scale is better than the other; each side has its own strengths."
      >
        <div className="mb-2 rounded-2xl bg-sun-100 p-4" data-testid="report-try-first">
          <p className="text-xs font-bold tracking-wide text-sun-700 uppercase">{report.tryFirst.label}</p>
          <p className="mt-1 text-sm text-ink">
            <span className="font-semibold">{report.tryFirst.name}:</span> {report.tryFirst.tip}
          </p>
        </div>
        <ul className="flex flex-col">
          {report.traits.map((trait) => (
            <li
              key={trait.trait}
              data-testid={`report-trait-${trait.trait}`}
              className="grid items-center gap-x-7 gap-y-3 border-t border-mist py-5 first:border-t-0 lg:grid-cols-[200px_1.15fr_1fr]"
            >
              <div className="flex items-center gap-3">
                <Letter letter={trait.trait} bg={TRAIT_BG[trait.trait]} />
                <p className="text-base font-bold text-ink">{trait.name}</p>
              </div>
              <div>
                <div
                  className="relative h-2.5 rounded-full bg-brand-100"
                  role="img"
                  aria-label={`${trait.name}: ${trait.score} out of 100`}
                >
                  <i
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full opacity-90 [print-color-adjust:exact]",
                      TRAIT_BG[trait.trait],
                    )}
                    style={{ width: `${Math.max(2, trait.score)}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-xs font-bold text-muted">{trait.score}</p>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-ink">{trait.title}</h3>
                <p className="mt-0.5 text-sm leading-[1.55] text-body">{trait.note}</p>
                <p className="mt-1 text-sm leading-[1.55] text-body">
                  <span className="font-bold text-ink">Tip:</span> {trait.tip}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 02 Interests */}
      <Section
        id="rp-int"
        testId="report-interests"
        number="02"
        eyebrow="Interests"
        title="What you love doing"
        lead="Your scores across six interest types used by career counsellors."
      >
        {report.flat ? (
          <p className="mb-5 rounded-2xl bg-brand-50 p-4 text-sm text-body" data-testid="report-flat-note">
            {report.flatNote}
          </p>
        ) : (
          report.closeNote && (
            <p className="mb-5 rounded-2xl bg-brand-50 p-4 text-sm text-body" data-testid="report-close-note">
              {report.closeNote}
            </p>
          )
        )}
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="px-8 py-6 sm:px-14">
            <Radar scores={scoreByType} />
          </div>
          <ul className="flex flex-col gap-3.5">
            {report.interests.map((interest, index) => {
              const top = !report.flat && index < report.areas.length;
              return (
                <li key={interest.type} className="flex items-center gap-3">
                  <Letter letter={interest.type} bg={TYPE_BG[interest.type]} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 flex justify-between gap-2.5 text-sm text-ink">
                      <span>{interest.name}</span>
                      <b className="font-extrabold">{interest.score}</b>
                    </p>
                    <div className="h-2.5 overflow-hidden rounded-full bg-brand-100">
                      <div
                        className={cn(
                          "h-full rounded-full [print-color-adjust:exact]",
                          top ? "bg-brand-600" : "bg-brand-300",
                        )}
                        style={{ width: `${Math.max(2, interest.score)}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {report.areas.length > 0 && (
          <div data-testid="report-careers" className="mt-8">
            <p className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">Your strongest areas, in order</p>
            <ol className="grid gap-4 lg:grid-cols-3" data-testid="report-holland">
              {report.areas.map((area, index) => (
                <li key={area.type} className="rounded-[22px] border border-line bg-paper p-5">
                  <div className="mb-3.5 flex items-center justify-between">
                    <Letter letter={area.type} bg={TYPE_BG[area.type]} />
                    <span className="text-xs font-bold tracking-wide text-brand-600 uppercase">#{index + 1}</span>
                  </div>
                  <h3 className="font-display text-[21px] leading-tight font-medium tracking-[-0.3px] text-ink">
                    {area.name} <span className="text-[15px] font-medium text-muted">{area.score}</span>
                  </h3>
                  <p className="mt-1.5 text-sm leading-[1.55] text-body">{area.description}</p>
                  <p className="mt-3 text-xs font-bold tracking-wide text-muted uppercase">Careers to explore</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {area.families.map((family) => (
                      <li
                        key={family}
                        className="rounded-full bg-brand-100 px-3 py-1.5 text-[13px] font-semibold text-brand-700"
                      >
                        {family}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Section>

      {/* 03 Courses */}
      <Section
        id="rp-crs"
        testId="report-courses"
        number="03"
        eyebrow="Course suggestions"
        title={report.coursesAreFallback ? "Popular courses to start with" : "Courses that may suit you"}
      >
        <ul className="grid gap-4 lg:grid-cols-3">
          {report.courses.map((course) => (
            <li key={course.slug} className="flex flex-col rounded-[22px] border border-line bg-paper p-5">
              <CourseLink
                href={`/learn/${course.slug}`}
                className="font-display text-xl leading-tight font-medium tracking-[-0.3px] text-ink hover:text-brand-600"
              >
                {course.title}
              </CourseLink>
              <p className="mt-2 text-sm leading-[1.55] text-body">{course.tagline}</p>
            </li>
          ))}
        </ul>
        <ButtonLink href="/learn" className="mt-6 print:hidden">
          Explore all courses
        </ButtonLink>
      </Section>

      {children}

      <HelplineLink className="justify-center rounded-full bg-brand-100 px-6 py-3.5 text-[15px] text-ink" />
      <div className="flex items-start gap-3.5 rounded-[20px] bg-mist px-5 py-4" role="note">
        <span
          className="grid size-[34px] flex-none place-items-center rounded-full bg-white text-brand-600"
          aria-hidden="true"
        >
          <Sparkles className="size-[18px]" />
        </span>
        <p className="text-[13px] leading-[1.65] text-body" data-testid="report-footer">
          {report.footer}
        </p>
      </div>
      <div className="flex justify-center print:hidden">
        <ButtonLink href="/discover" variant="ghost" size="sm">
          Take it again
        </ButtonLink>
      </div>
    </div>
  );
}
