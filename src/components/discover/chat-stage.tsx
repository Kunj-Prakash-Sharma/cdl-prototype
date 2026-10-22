"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CornerUpLeft, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SageAvatar } from "@/components/ui/misc";
import {
  BACKGROUNDS,
  GOALS,
  INTERESTS,
  JOURNEY_STAGES,
  STRENGTHS,
  optionLabel,
  type Option,
} from "@/lib/data/discovery";
import { cn } from "@/lib/format";
import { actions, useAppState, type Profile } from "@/lib/store";

type P = Partial<Profile>;

type ChatStep =
  | { key: "name"; kind: "text"; placeholder: string; messages: (p: P) => string[] }
  | { key: "stage" | "background" | "goal"; kind: "single"; options: Option[]; messages: (p: P) => string[] }
  | { key: "interests" | "strengths"; kind: "multi"; options: Option[]; max: number; messages: (p: P) => string[] };

const STAGE_ACK: Record<string, string> = {
  school: "Great time to explore — the choices you make now open lots of doors.",
  ug: "Perfect timing. College is the best time to test-drive different paths.",
  pg: "Nice. Let's make sure your specialisation lines up with where you want to go.",
  early: "Love it. Early in your career is when small pivots make the biggest difference.",
  switch: "Brave move — plenty of people switch successfully. Let's find the right direction.",
};

const GOAL_ACK: Record<string, string> = {
  "first-job": "Love that. Let's find a field you'll genuinely enjoy — and the skills that get you hired.",
  switch: "Got it. We'll look for paths that build on everything you already bring.",
  grow: "Ambitious — I like it. I'll factor leadership potential into your matches.",
  venture: "A future founder! I'll highlight the skills that matter most for building your own thing.",
  explore: "That's completely okay. Exploring is exactly what this is for.",
};

const STEPS: ChatStep[] = [
  {
    key: "name",
    kind: "text",
    placeholder: "Type your first name…",
    messages: () => [
      "Hi there! I'm Sage, your AI career guide at SELF.",
      "Over the next few minutes I'll get to know you, then we'll map careers that genuinely fit. What should I call you?",
    ],
  },
  {
    key: "stage",
    kind: "single",
    options: JOURNEY_STAGES,
    messages: (p) => [`Lovely to meet you, ${p.name}!`, "Where are you in your journey right now?"],
  },
  {
    key: "background",
    kind: "single",
    options: BACKGROUNDS,
    messages: (p) => [STAGE_ACK[p.stage ?? ""] ?? "Thanks for sharing.", "What's your field of study or background?"],
  },
  {
    key: "interests",
    kind: "multi",
    max: 4,
    options: INTERESTS,
    messages: (p) => [
      `${optionLabel(BACKGROUNDS, p.background)} — that gives me a useful starting point.`,
      "Which of these spark your curiosity? Pick up to 4 — go with your gut.",
    ],
  },
  {
    key: "strengths",
    kind: "multi",
    max: 3,
    options: STRENGTHS,
    messages: (p) => {
      const [a, b] = (p.interests ?? []).map((id) => optionLabel(INTERESTS, id));
      return [
        b
          ? `${a} and ${b.toLowerCase()} — that mix opens up some really interesting hybrid careers.`
          : `${a} — great, there are lots of directions to take that.`,
        "What do people usually come to you for? Choose up to 3 strengths.",
      ];
    },
  },
  {
    key: "goal",
    kind: "single",
    options: GOALS,
    messages: () => [
      "That's a strong combination.",
      "Last one for now: where do you see yourself in the next 3–5 years?",
    ],
  },
];

function closingMessages(p: P) {
  return [
    GOAL_ACK[p.goal ?? ""] ?? "Thank you!",
    `Thanks, ${p.name}. I've got a picture forming. Next, three short assessments will sharpen it — about 8 minutes, and no wrong answers (apart from a few fun puzzles).`,
  ];
}

function answerText(step: ChatStep, p: P) {
  const value = p[step.key];
  if (step.kind === "text") return String(value ?? "");
  if (Array.isArray(value)) return value.map((id) => optionLabel(step.options, id)).join(", ");
  return optionLabel(step.options, value as string);
}

function AiBubble({ children, delay = 0, first }: { children: ReactNode; delay?: number; first?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-end gap-2.5"
    >
      <span className={cn("w-8 shrink-0", !first && "invisible")}>
        <SageAvatar size="sm" />
      </span>
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-[15px] leading-relaxed text-slate-700 sm:max-w-[75%]">
        {children}
      </p>
    </motion.div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-[0_8px_20px_-10px_rgb(90_69_242/0.7)] sm:max-w-[70%]">
        {children}
      </p>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-end gap-2.5"
      aria-label="Sage is typing"
    >
      <SageAvatar size="sm" />
      <span className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </motion.div>
  );
}

export function ChatStage() {
  const { chatStep, profile } = useAppState();
  const [revealed, setRevealed] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typing = revealed < chatStep;
  const done = chatStep >= STEPS.length;

  useEffect(() => {
    if (revealed >= chatStep) return;
    const t = setTimeout(() => setRevealed(chatStep), revealed === -1 ? 700 : 1000);
    return () => clearTimeout(t);
  }, [chatStep, revealed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatStep, revealed]);

  const current = STEPS[chatStep];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-10">
      <section className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <SageAvatar />
            <div>
              <p className="font-bold text-ink">Sage</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" /> AI career guide · online
              </p>
            </div>
          </div>
          {chatStep > 0 && (
            <button
              type="button"
              onClick={() => {
                actions.chatBack();
                setRevealed(chatStep - 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-ink"
            >
              <CornerUpLeft className="size-3.5" aria-hidden /> Edit last answer
            </button>
          )}
        </header>

        <div
          ref={scrollRef}
          className="h-[min(560px,58dvh)] scrollbar-thin space-y-3 overflow-y-auto px-4 py-6 sm:px-6"
        >
          {STEPS.slice(0, chatStep).map((step) => (
            <div key={step.key} className="space-y-3">
              {step.messages(profile).map((m, i) => (
                <AiBubble key={i} first={i === 0}>
                  {m}
                </AiBubble>
              ))}
              <UserBubble>{answerText(step, profile)}</UserBubble>
            </div>
          ))}

          {typing && <Typing />}

          {!typing && current && (
            <div className="space-y-3">
              {current.messages(profile).map((m, i) => (
                <AiBubble key={`${chatStep}-${i}`} first={i === 0} delay={i * 0.35}>
                  {m}
                </AiBubble>
              ))}
            </div>
          )}

          {!typing && done && (
            <div className="space-y-3">
              {closingMessages(profile).map((m, i) => (
                <AiBubble key={`close-${i}`} first={i === 0} delay={i * 0.4}>
                  {m}
                </AiBubble>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-paper/60 p-4 sm:p-5">
          <AnimatePresence mode="wait">
            {!typing && (
              <motion.div
                key={chatStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: 0.45, duration: 0.25 }}
              >
                {done ? (
                  <div className="flex flex-col items-center gap-2 py-1 sm:flex-row sm:justify-between">
                    <p className="text-sm text-slate-500">Part 1 complete · 3 short assessments next</p>
                    <Button onClick={() => actions.setStage("personality")}>
                      Start assessments <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : current?.kind === "text" ? (
                  <TextComposer placeholder={current.placeholder} initial={profile.name ?? ""} />
                ) : current?.kind === "single" ? (
                  <SingleChoice step={current} selected={profile[current.key]} />
                ) : current?.kind === "multi" ? (
                  <MultiChoice step={current} initial={profile[current.key] ?? []} />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <ProfilePanel profile={profile} chatStep={chatStep} />
    </div>
  );
}

function TextComposer({ placeholder, initial }: { placeholder: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const clean = value.trim().slice(0, 30);
  const submit = () => {
    if (!clean) return;
    actions.answerChat("name", clean.charAt(0).toUpperCase() + clean.slice(1));
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-400"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Your first name"
        maxLength={30}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400"
      />
      <button
        type="submit"
        disabled={!clean}
        aria-label="Send"
        className="grid size-10 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}

function SingleChoice({ step, selected }: { step: Extract<ChatStep, { kind: "single" }>; selected?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {step.options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => actions.answerChat(step.key, o.id)}
          className={cn(
            "rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-all hover:-translate-y-0.5",
            selected === o.id
              ? "bg-brand-50 text-brand-700 ring-brand-300"
              : "bg-white text-slate-700 ring-slate-200 hover:text-brand-700 hover:ring-brand-300",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiChoice({ step, initial }: { step: Extract<ChatStep, { kind: "multi" }>; initial: string[] }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const full = picked.length >= step.max;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < step.max ? [...p, id] : p));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {step.options.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              disabled={!on && full}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-all",
                on
                  ? "bg-brand-600 text-white shadow-[0_6px_16px_-8px_rgb(90_69_242/0.8)] ring-brand-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:text-brand-700 hover:ring-brand-300 disabled:opacity-40 disabled:hover:translate-y-0",
              )}
            >
              {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          {picked.length}/{step.max} selected
        </p>
        <Button size="sm" disabled={picked.length === 0} onClick={() => actions.answerChat(step.key, picked)}>
          Continue <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function ProfilePanel({ profile, chatStep }: { profile: P; chatStep: number }) {
  const rows: { label: string; value?: string | string[] }[] = [
    { label: "Name", value: profile.name },
    { label: "Stage", value: profile.stage && optionLabel(JOURNEY_STAGES, profile.stage) },
    { label: "Background", value: profile.background && optionLabel(BACKGROUNDS, profile.background) },
    { label: "Interests", value: profile.interests?.map((id) => optionLabel(INTERESTS, id)) },
    { label: "Strengths", value: profile.strengths?.map((id) => optionLabel(STRENGTHS, id)) },
    { label: "Goal", value: profile.goal && optionLabel(GOALS, profile.goal) },
  ];
  const filled = Math.min(chatStep, STEPS.length);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-36 space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">What Sage has learned</p>
            <span className="text-xs font-semibold text-brand-700">
              {filled}/{STEPS.length}
            </span>
          </div>
          <ul className="mt-4 space-y-3.5">
            {rows.map((row, i) => {
              const has = i < chatStep && row.value && (!Array.isArray(row.value) || row.value.length > 0);
              return (
                <li key={row.label} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full transition-colors",
                      has ? "bg-emerald-500 text-white" : "bg-slate-100",
                    )}
                  >
                    {has && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{row.label}</p>
                    {has ? (
                      Array.isArray(row.value) ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.value.map((v) => (
                            <span
                              key={v}
                              className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm font-medium text-ink">{row.value}</p>
                      )
                    ) : (
                      <span className="mt-1.5 block h-2 w-24 rounded-full bg-slate-100" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-slate-400">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your answers shape your report and stay in this browser.
        </p>
      </div>
    </aside>
  );
}
