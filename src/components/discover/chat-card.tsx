"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { brand } from "@/config/brand";
import type { NextStep } from "@/modules/chat/types";
import { AiBubble, GuideAvatar, Typing, UserBubble } from "./chat-bubbles";

type CardStep = Extract<NextStep, { kind: "name" | "basics" }>;

/** A question already answered on Home (D87), shown above the current one with a way to change it. */
export type AnsweredStep = { prompt: string; label: string; onChange: () => void };

/** True once `key` has been on screen for a moment, so the guide seems to type before it speaks. */
function useRevealed(key: string) {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setRevealedKey(key), reduce ? 0 : 600);
    return () => clearTimeout(timer);
  }, [key]);
  return revealedKey === key;
}

/** The name question and the tap questions about the learner, in the V5 chat card. */
export function ChatCard({
  step,
  meta,
  ack,
  answered,
  hold = false,
  error,
  pending,
  onName,
  onChoose,
}: {
  step: CardStep;
  answered?: AnsweredStep | null;
  /** Keep "typing" (no question, no input) while the server decides what this card should ask. */
  hold?: boolean;
  /** The line under the guide's name: which part this is (from the server's progress). */
  meta: string;
  ack: string | null;
  error: string | null;
  pending: boolean;
  onName: (name: string) => void;
  onChoose: (index: number) => void;
}) {
  const revealed = useRevealed(step.id) && !hold;
  // After the guide has spoken, keyboard focus goes to the question (the name box focuses itself).
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealed && step.kind === "basics") region.current?.focus({ preventScroll: true });
  }, [revealed, step.kind]);
  return (
    <section className="flex min-h-120 flex-col overflow-hidden rounded-[28px] border border-line bg-white shadow-glow sm:min-h-140 sm:rounded-[32px]">
      <header className="flex items-center gap-3.5 border-b border-mist px-5 py-5 sm:px-8">
        <GuideAvatar />
        <div className="leading-snug">
          <h1 className="text-[17px] font-medium text-ink">{brand.guideName}</h1>
          <p className="text-[13px] text-muted">{meta}</p>
        </div>
      </header>

      <div ref={region} tabIndex={-1} className="flex-1 space-y-3 px-5 py-6 outline-none sm:px-8" aria-live="polite">
        {answered && (
          <div className="space-y-3" data-testid="home-answered">
            <AiBubble>{answered.prompt}</AiBubble>
            <UserBubble
              action={
                <button
                  type="button"
                  disabled={pending}
                  onClick={answered.onChange}
                  className="min-h-11 px-2 text-sm font-bold text-brand-600 underline-offset-4 hover:underline disabled:opacity-60"
                  data-testid="home-answer-change"
                >
                  Change
                </button>
              }
            >
              {answered.label}
            </UserBubble>
          </div>
        )}
        {!revealed ? (
          <Typing />
        ) : (
          <>
            {ack && <AiBubble>{ack}</AiBubble>}
            {step.kind === "name" && (
              <>
                <AiBubble>{`Hi, I'm ${brand.guideName}.`}</AiBubble>
                <AiBubble delay={0.2}>{"I'm a virtual guide, not a human."}</AiBubble>
              </>
            )}
            <AiBubble delay={step.kind === "name" ? 0.4 : 0.2}>{step.prompt}</AiBubble>
          </>
        )}
      </div>

      <div className="border-t border-mist px-5 pt-4 pb-5 sm:px-8 sm:pb-6">
        {revealed &&
          (step.kind === "name" ? (
            <NameInput pending={pending} onSubmit={onName} />
          ) : (
            <ChoiceChips options={step.options} pending={pending} onChoose={onChoose} />
          ))}
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function NameInput({ pending, onSubmit }: { pending: boolean; onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("");
  const clean = value.trim();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (clean && !pending) onSubmit(clean);
      }}
      className="flex items-center gap-2 rounded-full border-[1.5px] border-line bg-paper p-1.5 pl-5 transition focus-within:border-brand-600 focus-within:bg-white focus-within:shadow-focus"
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your first name…"
        aria-label="Your first name"
        // Only a size hint for the browser: the server decides what a valid name is.
        maxLength={100}
        autoComplete="given-name"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-muted/70"
        data-testid="name-input"
      />
      <button
        type="submit"
        disabled={!clean || pending}
        aria-label="Send"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-800 disabled:bg-brand-200"
        data-testid="name-send"
      >
        <ArrowUp className="size-5" strokeWidth={2.2} />
      </button>
    </form>
  );
}

function ChoiceChips({
  options,
  pending,
  onChoose,
}: {
  options: { index: number; label: string }[];
  pending: boolean;
  onChoose: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.index}
          type="button"
          disabled={pending}
          onClick={() => onChoose(option.index)}
          data-testid={`choice-${option.index}`}
          className="min-h-11 rounded-full border-[1.5px] border-brand-200 bg-white px-4 py-2.5 text-[15px] font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50 disabled:opacity-60"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
