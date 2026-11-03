"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { brand } from "@/config/brand";
import { SageAvatar } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import type { NextStep } from "@/modules/chat/types";
import { AiBubble, Typing } from "./chat-bubbles";

type CardStep = Extract<NextStep, { kind: "name" | "basics" }>;

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

/** The name question and the tap questions about the learner, in the prototype's chat look. */
export function ChatCard({
  step,
  ack,
  error,
  pending,
  onName,
  onChoose,
}: {
  step: CardStep;
  ack: string | null;
  error: string | null;
  pending: boolean;
  onName: (name: string) => void;
  onChoose: (index: number) => void;
}) {
  const revealed = useRevealed(step.id);
  // After the guide has spoken, keyboard focus goes to the question (the name box focuses itself).
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealed && step.kind === "basics") region.current?.focus({ preventScroll: true });
  }, [revealed, step.kind]);
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <SageAvatar />
        <div>
          <p className="font-bold text-ink">{brand.guideName}</p>
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Your career guide
          </p>
        </div>
      </header>

      <div ref={region} tabIndex={-1} className="min-h-44 space-y-3 px-4 py-6 outline-none sm:px-6" aria-live="polite">
        {!revealed ? (
          <Typing />
        ) : (
          <>
            {ack && <AiBubble first>{ack}</AiBubble>}
            {step.kind === "name" && <AiBubble first={!ack}>{`Hi, I'm ${brand.guideName}.`}</AiBubble>}
            <AiBubble delay={0.2} first={step.kind === "basics" && !ack}>
              {step.prompt}
            </AiBubble>
          </>
        )}
      </div>

      <div className="border-t border-slate-100 bg-paper/60 p-4 sm:p-5">
        {revealed &&
          (step.kind === "name" ? (
            <NameInput pending={pending} onSubmit={onName} />
          ) : (
            <ChoiceChips options={step.options} pending={pending} onChoose={onChoose} />
          ))}
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
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
      className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-400"
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
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400"
        data-testid="name-input"
      />
      <button
        type="submit"
        disabled={!clean || pending}
        aria-label="Send"
        className="grid size-11 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
        data-testid="name-send"
      >
        <Send className="size-4" />
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
          className={cn(
            "min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:text-brand-700 hover:ring-brand-300 disabled:opacity-60 motion-reduce:hover:translate-y-0",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
