"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isDiscoveryComplete } from "@/modules/chat/scoring";
import { useAppState, useHydrated, type Stage } from "@/lib/store";
import { AnalyzingStage } from "./analyzing-stage";
import { AptitudeStage } from "./aptitude-stage";
import { ChatStage } from "./chat-stage";
import { IntroStage } from "./intro-stage";
import { PersonalityStage } from "./personality-stage";
import { ResultsReport } from "./results-report";
import { Stepper } from "./stepper";
import { ValuesStage } from "./values-stage";

/**
 * CDL — the whole discovery journey (chat → assessments → report) on one page.
 * Stage lives in the local store, so a refresh resumes exactly where you were.
 */
export function DiscoveryFlow() {
  const hydrated = useHydrated();
  const state = useAppState();

  // Never show a report for answers that aren't all there.
  const stage: Stage = state.stage === "results" && !isDiscoveryComplete(state) ? "about" : state.stage;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-28">
        <div className="size-16 animate-pulse rounded-full bg-brand-100" />
        <div className="h-6 w-64 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded-full bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-linear-to-b from-brand-100/50 to-transparent" />
      {stage !== "intro" && <Stepper state={{ ...state, stage }} />}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
          className="relative"
        >
          {stage === "intro" && <IntroStage />}
          {stage === "about" && <ChatStage />}
          {stage === "personality" && <PersonalityStage />}
          {stage === "aptitude" && <AptitudeStage />}
          {stage === "values" && <ValuesStage />}
          {stage === "analyzing" && <AnalyzingStage />}
          {stage === "results" && <ResultsReport />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
