"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/format";
import type { NextStep } from "@/modules/chat/types";
import { AiBubble } from "./chat-bubbles";

type QuestionStep = Extract<NextStep, { kind: "question" }>;

// Circle sizes grow from the middle button outwards (the prototype's look). One entry per distance from the middle.
const CIRCLE = ["size-9 sm:size-10", "size-11 sm:size-12", "size-14 sm:size-16"];

/**
 * One scored question as a row of round buttons. The statement, the labels and the number of buttons all come from the
 * step: this file knows nothing about which question it is or what the scale is called.
 */
export function ScaleQuestion({
  step,
  ack,
  error,
  pending,
  onChoose,
}: {
  step: QuestionStep;
  ack: string | null;
  error: string | null;
  pending: boolean;
  onChoose: (value: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const labels = step.scale.labels;
  const middle = (labels.length - 1) / 2;
  // Keyboard focus moves to the new question, otherwise it falls to the page after each answer.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const choose = (value: number) => {
    if (pending) return;
    setSelected(value);
    onChoose(value);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Browser shortcuts (Ctrl+1 switches tabs) and a held key must not answer the question.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLInputElement) return;
      const value = Number(event.key);
      if (Number.isInteger(value) && value >= 1 && value <= labels.length && !pending) {
        setSelected(value);
        onChoose(value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [labels.length, pending, onChoose]);

  return (
    <div>
      {ack && (
        <div className="mb-4">
          <AiBubble first>{ack}</AiBubble>
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="px-4 py-10 sm:px-12 sm:py-14"
          >
            <p className="text-center text-sm font-semibold text-slate-400">{step.scale.prompt}</p>
            <h2
              ref={heading}
              tabIndex={-1}
              className="mx-auto mt-4 max-w-xl text-center text-2xl leading-snug font-bold tracking-tight text-balance text-ink outline-none sm:text-3xl"
              data-testid="question-text"
            >
              {step.text}
            </h2>

            <div
              className="mt-10 flex items-center justify-center gap-0.5 sm:gap-3"
              role="group"
              aria-label={step.scale.prompt}
            >
              {labels.map((label, i) => {
                const value = i + 1;
                const on = selected === value;
                const distance = Math.min(Math.round(Math.abs(i - middle)), CIRCLE.length - 1);
                const centre = i === middle;
                const high = i > middle;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    aria-label={label}
                    title={`${label} (${value})`}
                    disabled={pending}
                    data-testid={`scale-${value}`}
                    onClick={() => choose(value)}
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center disabled:opacity-60"
                  >
                    <span
                      className={cn(
                        "grid place-items-center rounded-full border-2 transition-all duration-200",
                        CIRCLE[distance],
                        centre
                          ? on
                            ? "border-slate-500 bg-slate-500"
                            : "border-slate-300 hover:bg-slate-100"
                          : high
                            ? on
                              ? "border-brand-600 bg-brand-600 shadow-glow"
                              : "border-brand-400 hover:bg-brand-50"
                            : on
                              ? "border-sun-500 bg-sun-500 shadow-glow"
                              : "border-sun-400 hover:bg-sun-100",
                      )}
                    >
                      {on && <span className="size-2.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mx-auto mt-3 flex max-w-md justify-between gap-3 text-xs font-semibold sm:text-sm">
              <span className="text-sun-600">{labels[0]}</span>
              <span className="text-slate-400">{selected ? labels[selected - 1] : ""}</span>
              <span className="text-right text-brand-700">{labels[labels.length - 1]}</span>
            </div>
            {error && (
              <p role="alert" className="mt-6 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
