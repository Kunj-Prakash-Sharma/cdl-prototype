import type { ReactNode } from "react";
import { motion } from "motion/react";
import { brand } from "@/config/brand";
import { LogoMark } from "@/components/ui/misc";
import { cn } from "@/lib/format";

/** The guide's round avatar (V5): violet disc with a white star that turns slowly. */
export function GuideAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 ring-[6px] ring-brand-100",
        className,
      )}
    >
      <LogoMark className="size-5 animate-[spin_14s_linear_infinite] fill-white motion-reduce:animate-none" />
    </span>
  );
}

/** The guide's speech bubble (V5): soft violet, square corner at the bottom left. */
export function AiBubble({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <p className="max-w-[85%] rounded-[18px] rounded-bl-md bg-brand-50 px-4.5 py-3 text-[15px] leading-relaxed text-ink sm:max-w-[78%]">
        {children}
      </p>
    </motion.div>
  );
}

/** The learner's own answer (V5): brand bubble on the right, square corner at the bottom right. */
export function UserBubble({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <p className="max-w-[85%] rounded-[18px] rounded-br-md bg-brand-600 px-4.5 py-3 text-[15px] leading-relaxed text-white sm:max-w-[78%]">
        {children}
      </p>
      {action}
    </div>
  );
}

export function Typing() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label={`${brand.guideName} is typing`}>
      <span className="inline-flex gap-1 rounded-[18px] rounded-bl-md bg-brand-50 px-4.5 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-brand-300 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </motion.div>
  );
}
