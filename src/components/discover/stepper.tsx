"use client";

import { Brain, ChartColumn, Check, Compass, MessageCircle, Puzzle } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import { discoveryProgress, isDiscoveryComplete } from "@/modules/chat/scoring";
import { actions, type AppState, type Stage } from "@/lib/store";

const TOTAL_MINUTES = 12;

export function Stepper({ state }: { state: AppState }) {
  const p = discoveryProgress(state);
  const complete = isDiscoveryComplete(state);
  const steps: { id: Stage; label: string; icon: typeof Brain; progress: number }[] = [
    { id: "about", label: "About you", icon: MessageCircle, progress: p.chat },
    { id: "personality", label: "Personality", icon: Brain, progress: p.likert },
    { id: "aptitude", label: "Aptitude", icon: Puzzle, progress: p.apt },
    { id: "values", label: "Work values", icon: Compass, progress: p.values },
    { id: "results", label: "Your report", icon: ChartColumn, progress: state.completedAt && complete ? 1 : 0 },
  ];
  const current = state.stage === "analyzing" ? "results" : state.stage;
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  );
  const minutesLeft = Math.max(1, Math.round((1 - p.overall) * TOTAL_MINUTES));
  const locked = state.stage === "analyzing";

  return (
    <div className="sticky top-16 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        {/* Compact (mobile) */}
        <div className="flex items-center justify-between gap-4 md:hidden">
          <p className="text-sm font-semibold text-ink">
            <span className="text-slate-400">Step {currentIndex + 1}/5 ·</span> {steps[currentIndex].label}
          </p>
          <p className="text-xs font-semibold text-brand-700">{Math.round(p.overall * 100)}%</p>
        </div>
        <ProgressBar value={p.overall} className="mt-2 md:hidden" />

        {/* Full (desktop) */}
        <div className="hidden items-center gap-6 md:flex">
          <ol className="flex flex-1 items-center">
            {steps.map((step, i) => {
              const done = step.progress >= 1;
              const active = i === currentIndex;
              const reachable =
                !locked &&
                (done ||
                  active ||
                  (step.id === "results" ? complete && !!state.completedAt : steps[i - 1]?.progress >= 1));
              return (
                <li key={step.id} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => actions.setStage(step.id)}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition",
                      reachable && !active && "hover:bg-slate-900/[0.04]",
                      !reachable && "cursor-default",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full text-sm transition-all duration-300",
                        done && !active && "bg-emerald-500 text-white",
                        active && "bg-brand-600 text-white shadow-glow ring-4 ring-brand-100",
                        !done && !active && "bg-slate-100 text-slate-400",
                      )}
                    >
                      {done && !active ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <step.icon className="size-4" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold whitespace-nowrap",
                        active ? "text-ink" : done ? "text-slate-600" : "text-slate-400",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <span className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-emerald-500 transition-[width] duration-700"
                        style={{ width: `${step.progress * 100}%` }}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-ink">{Math.round(p.overall * 100)}% complete</p>
            <p className="text-xs text-slate-500">{complete ? "All done" : `~${minutesLeft} min left`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
