// The FIXED sample report shown blurred behind the phone gate (D78). It is made of constants only: nothing from the
// visitor, no database read, so what the browser receives for a guest holds no real data and is the same for everyone.
// Built with the real report builder and wording, so it has exactly the design of the real report.
import { buildReport } from "./report";
import { CURRENT_REPORT_COPY } from "./report-copy";
import type { ResultView } from "./result";

const SAMPLE_RESULT: ResultView = {
  attemptId: "00000000-0000-4000-8000-000000000000", // never shown or used: a fixed placeholder
  setVersion: "sample",
  reportVersion: CURRENT_REPORT_COPY.version,
  ocean: {
    O: { score: 72, band: "higher" },
    C: { score: 55, band: "middle" },
    E: { score: 40, band: "middle" },
    A: { score: 68, band: "higher" },
    N: { score: 30, band: "lower" },
  },
  riasec: { R: 30, I: 78, A: 64, S: 58, E: 42, C: 35 },
  holland: { letters: ["I", "A", "S"], close: false },
  completedAt: "2026-01-01T00:00:00.000Z",
};

export const SAMPLE_REPORT = buildReport(SAMPLE_RESULT, CURRENT_REPORT_COPY);
