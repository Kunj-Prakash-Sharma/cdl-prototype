import type { ReactNode } from "react";
import { Lock, Sparkles, Star, TrendingUp } from "lucide-react";
import { brand } from "@/config/brand";
import { helpline } from "@/config/helpline";
import { Logo } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import type { LatestReport } from "@/modules/chat/service";
import { personaLead, personaSource } from "./persona-copy";
import { Letter, Radar, TRAIT_BG, TYPE_BG } from "./report-parts";

// The report on paper ("Save as PDF"), in the V5 PDF design (D91, V5-Report-PDF-1..5): A4 pages with a cover, one page
// per section and a running footer. Page numbers come from the browser (@page in globals.css), so they stay right
// when a section runs onto a second sheet. It is hidden on screen and shown only when printing; the screen report is hidden
// when printing (print:hidden in report-view.tsx). Server component, no script. No test ids here, so the screen report's
// ids stay unique.
//
// BACKEND GAPS (D92, open-questions.md), not built here:
//  - the learner's name on the cover and in the footer (the report data has no name; PII needs a decision first);
//  - the plain-language scale ends under each trait ("Likes the familiar" / "Loves new ideas"), and the "What your IAS
//    code means" paragraph (client-approved wording first);
//  - the "Career paths" page and the 65% / 35% match note (page 6 of the design): career paths are not in Phase 1;
// The persona (name, tagline, 3 strengths, 2 growth areas) is report data (D88), DRAFT wording until approved: the
// cover carries the same "Draft wording" tag as the screen while `report.draft` is set.
// The helpline line shows the placeholder number from src/config/helpline.ts until the client's number arrives.

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** One section, starting on a new sheet. The minimum height keeps the footer at the bottom of a one-sheet section; a longer
 * section runs on, and the browser numbers the extra sheet. */
function Page({
  label,
  date,
  last = false,
  children,
}: {
  label: string;
  date: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn("flex min-h-[262mm] flex-col [print-color-adjust:exact]", !last && "break-after-page")}
    >
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        {/* Eager, so every page's header logo is loaded before the learner prints. */}
        <Logo className="h-7" preload />
        <span className="text-xs font-bold tracking-[0.4px] text-muted uppercase">{label}</span>
      </div>
      {children}
      <p className="mt-auto border-t border-line pt-3 text-xs text-muted">
        {brand.name} · Career report · {date}
      </p>
    </section>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-extrabold tracking-[1.4px] text-brand-700 uppercase", className)}>{children}</p>
  );
}

function PageTitle({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mt-7">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1.5 font-display text-[34px] leading-[1.1] font-normal tracking-[-0.6px] text-ink">{title}</h2>
      {lead && <p className="mt-2.5 max-w-[620px] text-sm leading-[1.6] text-body">{lead}</p>}
    </div>
  );
}

function GlanceCard({
  badge,
  label,
  value,
  score,
}: {
  badge: ReactNode;
  label: string;
  value: string;
  score?: number;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line px-[18px] py-4">
      {badge}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-muted">{label}</p>
        <p className="text-base font-bold text-ink">{value}</p>
      </div>
      {score !== undefined && <b className="font-display text-[26px] font-medium text-brand-900">{score}</b>}
    </div>
  );
}

/** A persona strengths or growth list on paper: title on the left, its line on the right. */
function PersonaList({ items }: { items: LatestReport["persona"]["strengths"] }) {
  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li
          key={item.title}
          className="grid grid-cols-[210px_1fr] gap-7 border-t border-ink/10 py-[18px] first:border-t-0"
        >
          <p className="text-[15px] font-bold text-ink">{item.title}</p>
          <p className="text-sm leading-[1.55] text-body">{item.note}</p>
        </li>
      ))}
    </ul>
  );
}

export function ReportPrint({ report }: { report: LatestReport }) {
  const { persona } = report;
  const date = dayFormat.format(new Date(report.completedAt));
  const topInterest = report.interests[0];
  const standout = report.traits.reduce((best, t) => (t.score > best.score ? t : best), report.traits[0]);
  const scoreByType = Object.fromEntries(report.interests.map((i) => [i.type, i.score]));

  // Sections, in order. The contents list and the section labels take their numbers from this one list.
  const pages = [
    { id: "pers", label: "Personality", toc: "Personality" },
    { id: "int", label: "Interests", toc: "Interests" },
    { id: "str", label: "Strengths and growth", toc: "Strengths and growth" },
    { id: "about", label: "About this report", toc: "About this report" },
  ];
  const num = (id: string) => String(pages.findIndex((p) => p.id === id) + 1).padStart(2, "0");
  const label = (id: string) => `${num(id)} · ${pages.find((p) => p.id === id)?.label}`;

  return (
    <div className="hidden print:block" aria-hidden="true" data-testid="report-print-doc">
      {/* Cover */}
      <Page label="Career report · Private" date={date}>
        <div className="mt-7 rounded-3xl border border-brand-100 bg-brand-50 px-10 pt-9 pb-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3.5 py-1.5 text-[13px] font-bold text-brand-900">
            <span className="size-[7px] rounded-full bg-sun-500" />
            Your career report
          </p>
          {report.draft && (
            <span className="ml-2 inline-block rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-semibold text-sun-700">
              Draft wording
            </span>
          )}
          <p className="mt-5 text-[13px] font-extrabold tracking-[1.4px] text-sun-700 uppercase">
            Your career personality
          </p>
          <h1 className="mt-1.5 font-display text-[56px] leading-[1.05] font-normal tracking-[-1.6px] text-brand-900">
            {persona.name}
          </h1>
          <p className="mt-3 text-lg leading-normal text-body">{persona.tagline}</p>
          {!report.flat && report.hollandLetters.length > 0 && (
            <div className="mt-6 flex items-center gap-[18px]">
              <div className="flex gap-2">
                {report.hollandLetters.map((type) => (
                  <Letter key={type} letter={type} bg={TYPE_BG[type]} size="lg" />
                ))}
              </div>
              <p className="text-sm leading-[1.45] text-body">
                Your interest code
                <br />
                <b className="text-base text-ink">{report.areas.map((a) => a.name).join(" · ")}</b>
              </p>
            </div>
          )}
          <p className="mt-6 border-t border-brand-100 pt-4 text-xs text-muted">
            Created {date} · Based on industry-standard career and personality frameworks
          </p>
        </div>

        <Eyebrow className="mt-8">At a glance</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {topInterest && !report.flat && (
            <GlanceCard
              badge={<Letter letter={topInterest.type} bg={TYPE_BG[topInterest.type]} size="sm" />}
              label="Top interest"
              value={topInterest.name}
              score={topInterest.score}
            />
          )}
          {standout && (
            <GlanceCard
              badge={<Letter letter={standout.trait} bg={TRAIT_BG[standout.trait]} size="sm" />}
              label="Standout trait"
              value={standout.name}
              score={standout.score}
            />
          )}
          {persona.strengths[0] && (
            <GlanceCard
              badge={
                <span className="grid size-8 place-items-center rounded-[10px] bg-sun-500 text-white">
                  <Star className="size-4" />
                </span>
              }
              label="Top strength"
              value={persona.strengths[0].title}
            />
          )}
          {persona.growth[0] && (
            <GlanceCard
              badge={
                <span className="grid size-8 place-items-center rounded-[10px] bg-teal text-white">
                  <TrendingUp className="size-4" />
                </span>
              }
              label="Area to grow"
              value={persona.growth[0].title}
            />
          )}
        </div>

        <Eyebrow className="mt-8">What’s inside</Eyebrow>
        <ol className="mt-2.5 grid grid-cols-2 gap-x-7">
          {pages.map((p) => (
            <li key={p.id} className="flex items-baseline gap-3 border-b border-mist py-2.5 text-sm text-ink">
              <b className="w-[22px] text-brand-700">{num(p.id)}</b>
              <span className="flex-1">{p.toc}</span>
            </li>
          ))}
        </ol>
      </Page>

      {/* Personality */}
      <Page label={label("pers")} date={date}>
        <PageTitle
          eyebrow="01 · Personality"
          title="How you think, feel and work"
          lead="Five core traits, measured with a globally used personality framework. Scores run from 0 to 100."
        />
        <p className="mt-4 rounded-[14px] bg-brand-50 px-4 py-3.5 text-[13px] leading-[1.55] text-body">
          <b className="text-ink">How to read this:</b> neither end of a scale is better than the other. Each side has
          its own strengths. A score near 50 means you can lean either way depending on the situation.
        </p>
        <ul className="mt-2">
          {report.traits.map((trait) => (
            <li
              key={trait.trait}
              className="grid grid-cols-[250px_1fr] gap-7 border-b border-mist py-[18px] last:border-b-0"
            >
              <div>
                <div className="flex items-center gap-3">
                  <Letter letter={trait.trait} bg={TRAIT_BG[trait.trait]} size="sm" />
                  <p className="text-base font-bold text-ink">{trait.name}</p>
                </div>
                <div className="relative mt-4 h-2 rounded-full bg-brand-100">
                  <i
                    className={cn("absolute inset-y-0 left-0 rounded-full", TRAIT_BG[trait.trait])}
                    style={{ width: `${Math.max(2, trait.score)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-xs font-bold text-muted">{trait.score} / 100</p>
              </div>
              <div>
                <p className="text-[15px] font-bold text-ink">{trait.title}</p>
                <p className="mt-1 text-sm leading-[1.55] text-body">{trait.note}</p>
                <p className="mt-1 text-sm leading-[1.55] text-body">
                  <b className="text-ink">Tip:</b> {trait.tip}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Page>

      {/* Interests */}
      <Page label={label("int")} date={date}>
        <PageTitle
          eyebrow="02 · Interests"
          title="What you love doing"
          lead={
            report.flat || report.hollandLetters.length === 0
              ? "Your scores across six interest types used by career counsellors worldwide."
              : `Your scores across six interest types used by career counsellors worldwide. Your top three make up your interest code: ${report.hollandLetters.join("")}.`
          }
        />
        {(report.flat ? report.flatNote : report.closeNote) && (
          <p className="mt-4 rounded-[14px] bg-brand-50 px-4 py-3.5 text-[13px] leading-[1.55] text-body">
            {report.flat ? report.flatNote : report.closeNote}
          </p>
        )}
        <div className="mt-5 grid grid-cols-[250px_1fr] items-center gap-8">
          <div className="px-6">
            <Radar scores={scoreByType} />
          </div>
          <ul className="flex flex-col gap-3">
            {report.interests.map((interest, index) => {
              const top = !report.flat && index < report.areas.length;
              return (
                <li key={interest.type} className="flex items-center gap-3">
                  <Letter letter={interest.type} bg={TYPE_BG[interest.type]} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex justify-between gap-2.5 text-[13px] text-ink">
                      <span>{interest.name}</span>
                      <b className="font-extrabold">{interest.score}</b>
                    </p>
                    <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-brand-100">
                      <div
                        className={cn("h-full rounded-full", top ? "bg-brand-600" : "bg-brand-300")}
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
          <>
            <Eyebrow className="mt-7">Your top {report.areas.length}</Eyebrow>
            <ol className="mt-3 grid grid-cols-3 gap-3">
              {report.areas.map((area, index) => (
                <li key={area.type} className="break-inside-avoid rounded-[18px] border border-line p-[18px]">
                  <div className="flex items-center justify-between">
                    <Letter letter={area.type} bg={TYPE_BG[area.type]} size="sm" />
                    <span className="text-xs font-bold text-brand-700">
                      {index === 0 ? "Top interest" : `#${index + 1} interest`}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-tight font-medium text-ink">
                    {area.name} <span className="text-muted">{area.score}</span>
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-body">{area.description}</p>
                  <p className="mt-2.5 text-xs font-bold text-brand-900">Think: {area.families.join(", ")}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </Page>

      {/* Strengths and growth: from the persona (D88) */}
      <Page label={label("str")} date={date}>
        <PageTitle
          eyebrow={label("str")}
          title="What you’re great at, and what to build next"
          lead={personaLead(report.flat)}
        />
        <div className="mt-6 rounded-[20px] border border-sun-200 bg-sun-100 px-[26px] pt-[22px] pb-2.5">
          <p className="flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
            <span className="grid size-[30px] place-items-center rounded-[9px] bg-sun-500 text-white">
              <Star className="size-4" />
            </span>
            Your strengths
          </p>
          <PersonaList items={persona.strengths} />
        </div>
        <div className="mt-4 rounded-[20px] border border-line bg-brand-50 px-[26px] pt-[22px] pb-2.5">
          <p className="flex items-center gap-2.5 text-[15px] font-extrabold text-ink">
            <span className="grid size-[30px] place-items-center rounded-[9px] bg-teal text-white">
              <TrendingUp className="size-4" />
            </span>
            Areas to grow
          </p>
          <PersonaList items={persona.growth} />
        </div>
      </Page>

      {/* About this report */}
      <Page label={label("about")} date={date} last>
        <PageTitle eyebrow={`${num("about")} · About this report`} title="How your report was made" />
        <dl className="mt-[18px] border-t border-mist">
          {[
            [
              "Interests",
              "Six interest types used by career counsellors worldwide. Your three highest make up your interest code.",
            ],
            ["Personality", "Five core traits from a globally used personality framework, each scored 0 to 100."],
            ["Strengths and growth", personaSource(report.flat)],
            [
              `The chat with ${brand.guideName}`,
              "Used for context only, such as your stage of study. It is not scored.",
            ],
          ].map(([term, text]) => (
            <div
              key={term}
              className="grid grid-cols-[150px_1fr] gap-5 border-b border-mist py-3 text-[13px] leading-[1.55]"
            >
              <dt className="font-bold text-ink">{term}</dt>
              <dd className="text-body">{text}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-7 font-display text-[19px] font-medium text-ink">Keep in mind</h3>
        <ul className="mt-1.5">
          {[
            "Your answers are self-reported, so the results show how you see yourself today. They can change as you grow.",
            "This is a short assessment. Treat it as a starting point for conversations, not a final verdict.",
            "It is not a clinical or diagnostic test.",
          ].map((text) => (
            <li key={text} className="flex gap-2.5 py-1.5 text-[13px] leading-[1.55] text-body">
              <i className="mt-2 size-1.5 flex-none rounded-full bg-brand-600" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-start gap-3.5 rounded-2xl bg-brand-50 px-5 py-[18px]">
          <Sparkles className="mt-0.5 size-5 flex-none text-brand-600" />
          <p className="text-[13px] leading-[1.6] text-body">
            <b className="text-ink">Built from your answers.</b> Use this as a guide, not a final verdict.{" "}
            {report.footer}
          </p>
        </div>
        <div className="mt-3.5 flex items-start gap-3.5 rounded-2xl border border-line px-5 py-[18px]">
          <Lock className="mt-0.5 size-5 flex-none text-brand-700" />
          <p className="text-[13px] leading-[1.6] text-body">
            <b className="text-ink">This report is personal to you.</b> It contains your results. Share it only with
            people you trust, such as a parent, teacher or counsellor.
          </p>
        </div>

        <h3 className="mt-7 font-display text-[19px] font-medium text-ink">Help and support</h3>
        <p className="mt-2 grid grid-cols-[150px_1fr] gap-5 border-y border-mist py-3 text-[13px] leading-[1.55]">
          <b className="text-ink">Feeling low?</b>
          <span className="text-body">
            {helpline.name}: <b className="text-ink">{helpline.phoneDisplay}</b>
            {helpline.placeholder && <span className="ml-2 text-xs font-bold text-sun-700">placeholder</span>}
          </span>
        </p>
      </Page>
    </div>
  );
}
