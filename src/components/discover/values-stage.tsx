"use client";

import { motion } from "motion/react";
import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VALUES_TO_PICK, WORK_VALUES } from "@/modules/chat/questions";
import { cn } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { StageShell } from "./stage-shell";

export function ValuesStage() {
  const { values } = useAppState();
  const full = values.length >= VALUES_TO_PICK;

  const toggle = (id: string) => {
    if (values.includes(id)) actions.setValues(values.filter((v) => v !== id));
    else if (!full) actions.setValues([...values, id]);
  };

  return (
    <StageShell
      icon={Compass}
      part="Assessment 3 of 3"
      title="What matters most to you?"
      subtitle={`Pick your top ${VALUES_TO_PICK} work values, in order of importance.`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {WORK_VALUES.map((v) => {
          const rank = values.indexOf(v.id);
          const on = rank !== -1;
          return (
            <motion.button
              key={v.id}
              type="button"
              layout
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(v.id)}
              disabled={!on && full}
              aria-pressed={on}
              className={cn(
                "relative flex flex-col items-start rounded-2xl p-4 text-left ring-1 transition-all duration-200 sm:p-5",
                on
                  ? "bg-brand-600 text-white shadow-glow ring-brand-600"
                  : "bg-white shadow-soft ring-slate-200/80 hover:-translate-y-0.5 hover:ring-brand-300 disabled:opacity-40 disabled:hover:translate-y-0",
              )}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  on ? "bg-white/15 text-white" : "bg-brand-50 text-brand-700",
                )}
              >
                <v.icon className="size-5" aria-hidden />
              </span>
              <span className={cn("mt-4 font-bold", on ? "text-white" : "text-ink")}>{v.label}</span>
              <span className={cn("mt-1 text-xs leading-relaxed", on ? "text-white/75" : "text-slate-500")}>
                {v.detail}
              </span>
              {on && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-white text-sm font-extrabold text-brand-700"
                >
                  {rank + 1}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200/80 sm:p-6">
        <p className="text-sm font-bold text-ink">Your top {VALUES_TO_PICK}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Array.from({ length: VALUES_TO_PICK }).map((_, i) => {
            const v = WORK_VALUES.find((x) => x.id === values[i]);
            return (
              <div
                key={i}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                  v ? "bg-brand-50 text-brand-800" : "border border-dashed border-slate-300 text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs",
                    v ? "bg-brand-600 text-white" : "bg-slate-100",
                  )}
                >
                  {i + 1}
                </span>
                {v ? v.label : "Choose a value"}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
          <p className="text-sm text-slate-500">
            {full
              ? "Perfect — you're ready for your report."
              : `Select ${VALUES_TO_PICK - values.length} more to continue.`}
          </p>
          <Button disabled={!full} onClick={() => actions.setStage("analyzing")}>
            <Sparkles className="size-4" aria-hidden /> Generate my career report
          </Button>
        </div>
      </div>
    </StageShell>
  );
}
