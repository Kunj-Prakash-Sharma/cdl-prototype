"use client";

import { ArrowRight, ChartColumn, Lock, MessageCircle, Puzzle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, SageAvatar } from "@/components/ui/misc";
import { actions } from "@/lib/store";

const PARTS = [
  {
    icon: MessageCircle,
    title: "A quick chat",
    time: "~2 min",
    body: "Tell Sage about your education, interests, strengths and goals.",
  },
  {
    icon: Puzzle,
    title: "Three assessments",
    time: "~8 min",
    body: "Personality, aptitude puzzles and what you value in work.",
  },
  {
    icon: ChartColumn,
    title: "Your career report",
    time: "Instant",
    body: "Profile, strengths, top matches and a learning path.",
  },
];

export function IntroStage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center">
        <div className="relative mx-auto w-fit">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/40" />
          <SageAvatar size="lg" className="relative" />
        </div>
        <Badge tone="brand" className="mt-6">
          CDL · AI Career Discovery
        </Badge>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Hi, I&apos;m Sage. Let&apos;s discover{" "}
          <span className="text-gradient font-serif font-normal italic">your path</span> together.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          About 12 minutes, all on this page. There are no wrong answers — just be honest and go with your gut.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PARTS.map((part, i) => (
          <div key={part.title} className="relative rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <part.icon className="size-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {i + 1} · {part.time}
              </span>
            </div>
            <p className="mt-5 font-bold text-ink">{part.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{part.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <Button size="lg" onClick={() => actions.setStage("about")} className="min-w-64">
          Let&apos;s begin <ArrowRight className="size-4" aria-hidden />
        </Button>
        <button
          type="button"
          onClick={() => actions.fillDemoAnswers()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-brand-700 hover:underline"
        >
          <Wand2 className="size-4" aria-hidden />
          Stakeholder demo: skip ahead with sample answers
        </button>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="size-3.5" aria-hidden /> Your answers stay in this browser. Nothing is sent anywhere.
        </p>
      </div>
    </div>
  );
}
