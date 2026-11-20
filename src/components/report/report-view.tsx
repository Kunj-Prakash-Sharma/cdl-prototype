import type { ReactNode } from "react";
import { HelplineLink } from "@/components/discover/helpline-link";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/format";
import type { LatestReport } from "@/modules/chat/service";
import { CourseLink, PrintButton, ReportLink } from "./report-actions";

// The free report, drawn from the data `getLatestReport` returns (E5-S1). TEMPORARY layout: plain cards in the
// prototype's style, to be restyled when the new design lands. All wording that belongs to the report (cards, interest
// names, career families, notes, footer) comes from the report data (report-copy.ts); only page chrome lives here.

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const isoDay = (iso: string) => iso.slice(0, 10);

function Card({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <section
      data-testid={testId}
      className={cn(
        "break-inside-avoid rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80 sm:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ReportView({ report, children }: { report: LatestReport; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6" data-testid="report">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your career report</h1>
          <p className="mt-1 text-sm text-slate-500">Finished on {dayFormat.format(new Date(report.completedAt))}</p>
          {report.draft && (
            <span
              data-testid="report-draft"
              className="mt-2 inline-block rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-semibold text-sun-700"
            >
              Draft wording
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton fileTitle={`Career report ${isoDay(report.completedAt)}`} />
          <ReportLink href="#callback" action="callback" variant="primary" testId="report-callback-button">
            Request a callback
          </ReportLink>
        </div>
      </div>

      <Card testId="report-interests">
        <h2 className="text-xl font-bold text-ink">Your interests</h2>
        {report.flat ? (
          <p className="mt-3 rounded-2xl bg-brand-50 p-4 text-sm text-slate-700" data-testid="report-flat-note">
            {report.flatNote}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">Your strongest interest areas, in order:</p>
            <ol className="mt-3 flex flex-wrap gap-2" data-testid="report-holland">
              {report.areas.map((area) => (
                <li
                  key={area.type}
                  className="rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white print:bg-slate-200 print:text-ink"
                >
                  {area.name}
                </li>
              ))}
            </ol>
            {report.closeNote && (
              <p className="mt-3 rounded-2xl bg-brand-50 p-4 text-sm text-slate-700" data-testid="report-close-note">
                {report.closeNote}
              </p>
            )}
          </>
        )}
        <ul className="mt-5 space-y-3">
          {report.interests.map((interest, index) => {
            const top = !report.flat && index < report.areas.length;
            return (
              <li key={interest.type}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink">{interest.name}</span>
                  <span className="text-slate-500">{interest.score}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full [print-color-adjust:exact]",
                      top ? "bg-brand-500" : "bg-brand-200",
                    )}
                    style={{ width: `${Math.max(2, interest.score)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{interest.description}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      {report.areas.length > 0 && (
        <Card testId="report-careers">
          <h2 className="text-xl font-bold text-ink">Careers to explore</h2>
          <div className="mt-4 space-y-5">
            {report.areas.map((area) => (
              <div key={area.type}>
                <h3 className="text-sm font-semibold text-slate-500">{area.name}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {area.families.map((family) => (
                    <li key={family} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {family}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card testId="report-traits">
        <h2 className="text-xl font-bold text-ink">How you tend to be</h2>
        <div className="mt-4 rounded-2xl bg-sun-100 p-4" data-testid="report-try-first">
          <p className="text-xs font-bold tracking-wide text-sun-700 uppercase">{report.tryFirst.label}</p>
          <p className="mt-1 text-sm text-ink">
            <span className="font-semibold">{report.tryFirst.name}:</span> {report.tryFirst.tip}
          </p>
        </div>
        <ul className="mt-5 space-y-5">
          {report.traits.map((trait) => (
            <li key={trait.trait} data-testid={`report-trait-${trait.trait}`}>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{trait.name}</p>
              <h3 className="mt-0.5 text-lg font-bold text-ink">{trait.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{trait.note}</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-ink">Tip:</span> {trait.tip}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card testId="report-courses">
        <h2 className="text-xl font-bold text-ink">
          {report.coursesAreFallback ? "Popular courses to start with" : "Courses that may suit you"}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {report.courses.map((course) => (
            <li key={course.slug} className="rounded-2xl bg-slate-50 p-4">
              <CourseLink
                href={`/learn/${course.slug}`}
                className="font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                {course.title}
              </CourseLink>
              <p className="mt-1 text-xs text-slate-600">{course.tagline}</p>
            </li>
          ))}
        </ul>
      </Card>

      {children}

      <HelplineLink className="justify-center" />
      <p className="text-center text-xs text-slate-500" data-testid="report-footer">
        {report.footer}
      </p>
      <div className="flex justify-center print:hidden">
        <ButtonLink href="/discover" variant="ghost" size="sm">
          Take it again
        </ButtonLink>
      </div>
    </div>
  );
}
