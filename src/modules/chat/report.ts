// PURE: turns a saved result and a wording version into the report the learner reads. No database, no clock, no
// randomness. All wording comes from the ReportCopy it is given (report-copy.ts), and the result carries the version it
// must be read with, so a later wording edit never changes a report that was already read.
// Never in a report (D72, CLAUDE.md): percentile, salary, fit percentage, aptitude, work values, learner counts.
import type { ResultView } from "./result";
import { OCEAN_DIMENSIONS, RIASEC_DIMENSIONS, type OceanDimension, type RiasecDimension } from "./question-set";
import { personaIdFor } from "./persona";
import { getReportCopy, type PersonaCopy, type PersonaId, type ReportCopy } from "./report-copy";
import type { OceanBand } from "./scoring";

export type InterestScore = { type: RiasecDimension; name: string; description: string; score: number };
/** One of the learner's top interest areas, with example career families (broad areas of work, nothing per person). */
export type InterestArea = InterestScore & { families: string[] };
export type TraitView = {
  trait: OceanDimension;
  name: string;
  band: OceanBand;
  score: number;
  title: string;
  note: string;
  tip: string;
};

/** The learner's persona (D81): picked by the top interest letter, or the generic one for a flat profile. */
export type PersonaView = PersonaCopy & { id: PersonaId };

export type ReportView = {
  /** The wording version used. */
  copyVersion: string;
  /** True while the wording is a placeholder: the screen must show a draft tag (open-questions.md). */
  draft: boolean;
  completedAt: string; // ISO date
  persona: PersonaView;
  /** All six interest types, highest first; ties in the order R, I, A, S, E, C. */
  interests: InterestScore[];
  /** The top three interest areas in rank order with career families; empty when the profile is flat. */
  areas: InterestArea[];
  hollandLetters: RiasecDimension[];
  flat: boolean;
  /** Set when the top three are close together: a shortlist, not a ranking. */
  closeNote: string | null;
  /** Set when no interest stands out. */
  flatNote: string | null;
  /** One card per personality trait, in the order O, C, E, A, N. */
  traits: TraitView[];
  /** The tip of the lowest-scoring trait; ties go to the first in O, C, E, A, N order. */
  tryFirst: { label: string; trait: OceanDimension; name: string; tip: string };
  footer: string;
};

export type ReportError = { ok: false; code: "unknown_copy_version" };

/** Builds the report from the given wording. Pure: the wording is passed in, never looked up here. */
export function buildReport(result: ResultView, copy: ReportCopy): ReportView {
  const interests: InterestScore[] = RIASEC_DIMENSIONS.map((type) => ({
    type,
    name: copy.interests[type].name,
    description: copy.interests[type].description,
    score: result.riasec[type],
  })).sort((a, b) => b.score - a.score || RIASEC_DIMENSIONS.indexOf(a.type) - RIASEC_DIMENSIONS.indexOf(b.type));

  const flat = "flat" in result.holland;
  const hollandLetters = "letters" in result.holland ? result.holland.letters : [];
  const close = "letters" in result.holland && result.holland.close;

  const areas: InterestArea[] = hollandLetters.map((type) => {
    const interest = interests.find((entry) => entry.type === type)!;
    return { ...interest, families: [...copy.careerFamilies[type]] };
  });

  const traits: TraitView[] = OCEAN_DIMENSIONS.map((trait) => {
    const { score, band } = result.ocean[trait];
    const card = copy.traits[trait].cards[band];
    return { trait, name: copy.traits[trait].name, band, score, ...card };
  });

  // Strict "<" keeps the first trait in O, C, E, A, N order when scores tie.
  const lowest = traits.reduce((low, next) => (next.score < low.score ? next : low));

  const personaId = personaIdFor(result.holland);
  const persona: PersonaView = { id: personaId, ...copy.personas[personaId] };

  return {
    copyVersion: copy.version,
    draft: copy.draft,
    completedAt: result.completedAt,
    persona,
    interests,
    areas,
    hollandLetters: [...hollandLetters],
    flat,
    closeNote: close ? copy.closeNote : null,
    flatNote: flat ? copy.flatNote : null,
    traits,
    tryFirst: { label: copy.tryFirstLabel, trait: lowest.trait, name: lowest.name, tip: lowest.tip },
    footer: copy.footer,
  };
}

/** Builds the report with the wording version the result was stamped with; a missing version is a typed failure. */
export function reportFor(result: ResultView): { ok: true; report: ReportView } | ReportError {
  const copy = getReportCopy(result.reportVersion);
  return copy ? { ok: true, report: buildReport(result, copy) } : { ok: false, code: "unknown_copy_version" };
}
