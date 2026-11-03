import { Check } from "lucide-react";
import { cn } from "@/lib/format";
import type { Progress } from "@/modules/chat/types";

/**
 * The step bar under the navbar (the prototype's look): a check for finished parts, a highlighted circle for the
 * current one, the lines fill as you go, and a percentage. Every label and count comes from the progress the server
 * sends, so this file knows no part names and no number of parts.
 */
export function QuizStepper({ progress }: { progress: Progress }) {
  const steps = [
    ...progress.stages.map((stage) => ({
      key: stage.id,
      label: stage.label,
      fill: stage.total > 0 ? stage.answered / stage.total : 0,
      done: stage.total > 0 && stage.answered >= stage.total,
    })),
    { key: "finish", label: progress.finishLabel, fill: 0, done: false },
  ];
  const active = steps.findIndex((step) => !step.done);
  const percent = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;

  return (
    <nav
      aria-label="Progress"
      className="sticky top-16 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur"
      data-testid="progress"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <ol className="flex min-w-0 flex-1 items-center">
          {steps.map((step, index) => {
            const isActive = index === active;
            const last = index === steps.length - 1;
            return (
              <li
                key={step.key}
                aria-current={isActive ? "step" : undefined}
                className={cn("flex items-center", !last && "flex-1")}
              >
                <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-xs font-bold transition-colors duration-300",
                      step.done
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "bg-brand-600 text-white ring-4 ring-brand-100"
                          : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {step.done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      // On a phone the bar shows only circles and lines: the heading below already names the part.
                      "hidden sm:inline",
                      isActive ? "text-ink" : step.done ? "text-slate-600" : "text-slate-400",
                    )}
                  >
                    {step.label}
                  </span>
                </span>
                {!last && (
                  <span className="mx-1.5 h-0.5 min-w-2 flex-1 overflow-hidden rounded-full bg-slate-200 sm:mx-3 sm:min-w-3">
                    <span
                      className="block h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${step.done ? 100 : Math.round(step.fill * 100)}%` }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="shrink-0 text-right text-xs font-semibold text-slate-500 sm:text-sm">
          <span className="font-extrabold text-ink">{percent}%</span>
          <span className="hidden sm:inline"> complete</span>
        </p>
      </div>
    </nav>
  );
}
