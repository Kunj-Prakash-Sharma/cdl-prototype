"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { SageAvatar } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";

const STEPS = [
  "Mapping your interest profile",
  "Scoring your aptitude results",
  "Matching you against career profiles",
  "Curating your Level 1 learning path",
];

const STEP_MS = 950;

export function AnalyzingStage() {
  const { profile } = useAppState();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => actions.completeDiscovery(), 500);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <div className="relative grid size-40 place-items-center">
        <span className="animate-pulse-ring absolute inset-6 rounded-full bg-brand-400/40" />
        <span className="animate-pulse-ring absolute inset-6 rounded-full bg-fuchsia-400/30 [animation-delay:0.7s]" />
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-dashed border-brand-200"
        />
        <SageAvatar size="lg" className="relative scale-125" />
      </div>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-ink">
        Analysing your answers{profile.name ? `, ${profile.name}` : ""}…
      </h1>
      <p className="mt-2 text-slate-600">Sage is building your personalised career report.</p>

      <ul className="mt-10 w-full max-w-sm space-y-3 text-left">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: i <= step ? 1 : 0.4, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/80 shadow-soft"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  done ? "bg-emerald-500 text-white" : active ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-300",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : active ? <LoaderCircle className="size-4 animate-spin" /> : null}
              </span>
              <span className={cn("text-sm font-semibold", done || active ? "text-ink" : "text-slate-400")}>{label}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
