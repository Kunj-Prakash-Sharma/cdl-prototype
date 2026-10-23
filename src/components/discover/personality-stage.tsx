"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIKERT_ITEMS, LIKERT_SCALE } from "@/modules/chat/questions";
import { cn } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { SectionComplete, StageShell } from "./stage-shell";

const SIZES = [
  "size-14 sm:size-16",
  "size-11 sm:size-12",
  "size-9 sm:size-10",
  "size-11 sm:size-12",
  "size-14 sm:size-16",
];

export function PersonalityStage() {
  const { likert } = useAppState();
  const firstOpen = LIKERT_ITEMS.findIndex((i) => !likert[i.id]);
  const [index, setIndex] = useState(firstOpen === -1 ? LIKERT_ITEMS.length : firstOpen);
  const [direction, setDirection] = useState(1);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const answered = LIKERT_ITEMS.filter((i) => likert[i.id]).length;
  const item = LIKERT_ITEMS[index];
  const finished = index >= LIKERT_ITEMS.length;

  const go = useCallback(
    (to: number) => {
      setDirection(to > index ? 1 : -1);
      setIndex(to);
    },
    [index],
  );

  const choose = useCallback(
    (value: number) => {
      if (!item) return;
      actions.answerLikert(item.id, value);
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        setDirection(1);
        setIndex((i) => i + 1);
      }, 320);
    },
    [item],
  );

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) choose(n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, finished]);

  if (finished) {
    return (
      <StageShell
        icon={Brain}
        part="Assessment 1 of 3"
        title="Personality & interests"
        subtitle="How you like to think, work and spend your energy."
      >
        <SectionComplete
          title="Personality section complete"
          body="Great work. Next up: six quick aptitude puzzles. Take your time — there's no timer."
          action={
            <div className="flex flex-col-reverse items-center gap-3 sm:flex-row">
              <Button variant="ghost" onClick={() => go(LIKERT_ITEMS.length - 1)}>
                <ArrowLeft className="size-4" aria-hidden /> Review answers
              </Button>
              <Button onClick={() => actions.setStage("aptitude")}>
                Continue to aptitude quiz <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          }
        />
      </StageShell>
    );
  }

  const selected = likert[item.id];

  return (
    <StageShell
      icon={Brain}
      part="Assessment 1 of 3"
      title="Personality & interests"
      subtitle="How much does each statement sound like you?"
      aside={
        <p className="text-sm font-semibold text-slate-500">
          <span className="text-2xl font-extrabold text-ink">{answered}</span>/{LIKERT_ITEMS.length} answered
        </p>
      }
    >
      <div className="mb-5 flex gap-1" aria-hidden>
        {LIKERT_ITEMS.map((it, i) => (
          <button
            key={it.id}
            type="button"
            tabIndex={-1}
            onClick={() => (likert[it.id] || i === firstOpen ? go(i) : undefined)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i === index ? "bg-brand-600" : likert[it.id] ? "bg-brand-300" : "bg-slate-200",
            )}
          />
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={item.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="px-5 py-10 sm:px-12 sm:py-14"
          >
            <p className="text-center text-sm font-semibold text-slate-400">
              Statement {index + 1} of {LIKERT_ITEMS.length}
            </p>
            <h2 className="mx-auto mt-4 max-w-xl text-center text-2xl leading-snug font-bold tracking-tight text-balance text-ink sm:text-3xl">
              “{item.text}”
            </h2>

            <div
              className="mt-10 flex items-center justify-center gap-2.5 sm:gap-5"
              role="radiogroup"
              aria-label="Your answer"
            >
              {LIKERT_SCALE.map((opt, i) => {
                const on = selected === opt.value;
                const agree = opt.value > 3;
                const neutral = opt.value === 3;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={opt.label}
                    title={`${opt.label} (${opt.value})`}
                    onClick={() => choose(opt.value)}
                    className={cn(
                      "grid shrink-0 place-items-center rounded-full border-2 transition-all duration-200 hover:scale-110",
                      SIZES[i],
                      neutral
                        ? on
                          ? "border-slate-500 bg-slate-500"
                          : "border-slate-300 hover:bg-slate-100"
                        : agree
                          ? on
                            ? "border-brand-600 bg-brand-600 shadow-glow"
                            : "border-brand-400 hover:bg-brand-50"
                          : on
                            ? "border-sun-500 bg-sun-500 shadow-[0_10px_30px_-10px_rgb(255_138_46/0.8)]"
                            : "border-sun-400 hover:bg-sun-100",
                    )}
                  >
                    {on && <span className="size-2.5 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>
            <div className="mx-auto mt-4 flex max-w-md justify-between text-xs font-semibold sm:text-sm">
              <span className="text-sun-600">Disagree</span>
              <span className="text-slate-400">{selected ? LIKERT_SCALE[selected - 1].label : "Tap or press 1–5"}</span>
              <span className="text-brand-700">Agree</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => go(index - 1)}>
          <ArrowLeft className="size-4" aria-hidden /> Previous
        </Button>
        <Button variant="ghost" size="sm" disabled={!selected} onClick={() => go(index + 1)}>
          Next <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </StageShell>
  );
}
