"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/format";
import type { NextStep, StageProgress } from "@/modules/chat/types";
import { AiBubble } from "./chat-bubbles";

type QuestionStep = Extract<NextStep, { kind: "question" }>;

/**
 * One scored question as a row of round buttons (V5). The statement, the labels and the number of buttons all come
 * from the step: this file knows nothing about which question it is or what the scale is called.
 */
export function ScaleQuestion({
  step,
  stage,
  ack,
  error,
  pending,
  onChoose,
}: {
  step: QuestionStep;
  /** The part this question belongs to, for "Question 5 of 10". */
  stage: StageProgress;
  ack: string | null;
  error: string | null;
  pending: boolean;
  onChoose: (value: number) => void;
}) {
  // The pick is remembered with its question, so it clears itself when the next question arrives. This component is not
  // remounted per question: only the content inside the card slides.
  const [picked, setPicked] = useState<{ id: string; value: number } | null>(null);
  // After a failed save (an error shows) the pick is not shown, so the learner can answer again.
  const selected = picked?.id === step.id && !error ? picked.value : null;
  const labels = step.scale.labels;
  // Keyboard focus moves to each new question as it appears, otherwise it falls to the page after each answer.
  const focusHeading = useCallback((element: HTMLHeadingElement | null) => {
    element?.focus({ preventScroll: true });
  }, []);

  const choose = (value: number) => {
    if (pending) return;
    setPicked({ id: step.id, value });
    onChoose(value);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Browser shortcuts (Ctrl+1 switches tabs) and a held key must not answer the question.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLInputElement) return;
      const value = Number(event.key);
      if (Number.isInteger(value) && value >= 1 && value <= labels.length && !pending) {
        setPicked({ id: step.id, value });
        onChoose(value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [labels.length, pending, onChoose, step.id]);

  return (
    <div>
      {ack && (
        <div className="mb-4">
          <AiBubble>{ack}</AiBubble>
        </div>
      )}
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-white sm:rounded-[32px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="px-5 py-8 sm:px-12 sm:py-14"
          >
            <p className="text-[13px] font-semibold text-brand-700">
              {stage.label} · question {stage.answered + 1}
            </p>
            <h2
              ref={focusHeading}
              tabIndex={-1}
              className="mt-2 font-display text-[22px] leading-[1.25] font-normal tracking-[-0.5px] text-balance text-ink outline-none sm:text-[28px] lg:text-[32px]"
              data-testid="question-text"
            >
              {step.text}
            </h2>
            <p className="mt-3 text-[15px] text-body">{step.scale.prompt}</p>

            <div
              className="mt-8 flex max-w-130 justify-between gap-2 sm:mt-10 sm:gap-4"
              role="group"
              aria-label={step.scale.prompt}
            >
              {labels.map((label, i) => {
                const value = i + 1;
                const on = selected === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    aria-label={label}
                    disabled={pending}
                    data-testid={`scale-${value}`}
                    onClick={() => choose(value)}
                    className={cn(
                      "grid size-12 place-items-center rounded-full border-[1.5px] font-display text-lg transition-all duration-200 disabled:opacity-60 motion-reduce:transition-none sm:size-16",
                      on
                        ? "scale-110 border-brand-600 bg-brand-600 text-white ring-8 ring-brand-600/15"
                        : "border-line-strong bg-white text-ink hover:border-brand-600",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex max-w-130 justify-between gap-3 text-[13px] text-muted">
              <span>{labels[0]}</span>
              <span className="hidden text-center sm:inline">
                {selected ? labels[selected - 1] : `Tap or press 1–${labels.length}`}
              </span>
              <span className="text-right">{labels[labels.length - 1]}</span>
            </div>
            {error && (
              <p role="alert" className="mt-6 text-sm font-medium text-sun-600">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
