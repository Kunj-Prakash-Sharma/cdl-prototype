"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Puzzle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { APTITUDE_QUESTIONS, APTITUDE_SKILL_LABEL } from "@/lib/data/discovery";
import { cn } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { SectionComplete, StageShell } from "./stage-shell";

const LETTERS = ["A", "B", "C", "D"];

export function AptitudeStage() {
  const { aptitude } = useAppState();
  const firstOpen = APTITUDE_QUESTIONS.findIndex((q) => !(q.id in aptitude));
  const [index, setIndex] = useState(firstOpen === -1 ? APTITUDE_QUESTIONS.length : firstOpen);

  const answeredQs = APTITUDE_QUESTIONS.filter((q) => q.id in aptitude);
  const score = answeredQs.filter((q) => aptitude[q.id] === q.answer).length;
  const finished = index >= APTITUDE_QUESTIONS.length;

  if (finished) {
    return (
      <StageShell icon={Puzzle} part="Assessment 2 of 3" title="Aptitude quiz" subtitle="Quick puzzles across reasoning, numbers, words and patterns.">
        <SectionComplete
          title={`You scored ${score} out of ${APTITUDE_QUESTIONS.length}`}
          body="Nicely done! One last step — tell us what matters most to you in your work."
          action={
            <Button onClick={() => actions.setStage("values")}>
              Continue to work values <ArrowRight className="size-4" aria-hidden />
            </Button>
          }
        >
          <div className="mx-auto mt-6 flex max-w-sm justify-center gap-2">
            {APTITUDE_QUESTIONS.map((q) => {
              const ok = aptitude[q.id] === q.answer;
              return (
                <span
                  key={q.id}
                  title={APTITUDE_SKILL_LABEL[q.skill]}
                  className={cn("grid size-9 place-items-center rounded-xl", ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}
                >
                  {ok ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
                </span>
              );
            })}
          </div>
        </SectionComplete>
      </StageShell>
    );
  }

  const q = APTITUDE_QUESTIONS[index];
  const chosen = aptitude[q.id];
  const revealed = chosen !== undefined;
  const isLast = index === APTITUDE_QUESTIONS.length - 1;

  return (
    <StageShell
      icon={Puzzle}
      part="Assessment 2 of 3"
      title="Aptitude quiz"
      subtitle="Pick the best answer. You'll see the explanation straight away."
      aside={
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500">
            Score <span className="text-2xl font-extrabold text-ink">{score}</span>/{answeredQs.length || 0}
          </span>
        </div>
      }
    >
      <div className="mb-5 flex gap-1" aria-hidden>
        {APTITUDE_QUESTIONS.map((x, i) => {
          const a = aptitude[x.id];
          return (
            <span
              key={x.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i === index ? "bg-brand-600" : a === undefined ? "bg-slate-200" : a === x.answer ? "bg-emerald-400" : "bg-rose-300",
              )}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28 }}
          className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 shadow-soft sm:p-8"
        >
          <div className="flex items-center justify-between">
            <Badge tone="slate">{APTITUDE_SKILL_LABEL[q.skill]}</Badge>
            <span className="text-sm font-semibold text-slate-400">
              Question {index + 1} of {APTITUDE_QUESTIONS.length}
            </span>
          </div>
          <h2 className="mt-5 text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">{q.prompt}</h2>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const correct = i === q.answer;
              const picked = i === chosen;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  onClick={() => actions.answerAptitude(q.id, i)}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl p-4 text-left text-[15px] font-medium ring-1 transition-all duration-200",
                    !revealed && "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:bg-brand-50/50 hover:ring-brand-300",
                    revealed && correct && "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400",
                    revealed && picked && !correct && "bg-rose-50 text-rose-800 ring-2 ring-rose-300",
                    revealed && !picked && !correct && "bg-white text-slate-400 ring-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold transition-colors",
                      !revealed && "bg-slate-100 text-slate-500 group-hover:bg-brand-600 group-hover:text-white",
                      revealed && correct && "bg-emerald-500 text-white",
                      revealed && picked && !correct && "bg-rose-400 text-white",
                      revealed && !picked && !correct && "bg-slate-100 text-slate-400",
                    )}
                  >
                    {revealed && correct ? <Check className="size-4" strokeWidth={3} /> : revealed && picked ? <X className="size-4" strokeWidth={3} /> : LETTERS[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <div className="mt-6 flex gap-3 rounded-2xl bg-paper p-4 ring-1 ring-slate-200/70">
                  <Lightbulb className="mt-0.5 size-5 shrink-0 text-sun-500" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-ink">{chosen === q.answer ? "Correct!" : "Not quite."}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{q.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ArrowLeft className="size-4" aria-hidden /> Previous
        </Button>
        <Button size="sm" disabled={!revealed} onClick={() => setIndex(index + 1)}>
          {isLast ? "Finish quiz" : "Next question"} <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </StageShell>
  );
}
