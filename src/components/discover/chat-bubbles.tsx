import type { ReactNode } from "react";
import { motion } from "motion/react";
import { brand } from "@/config/brand";
import { SageAvatar } from "@/components/ui/misc";
import { cn } from "@/lib/format";

/** The guide's speech bubble (the prototype's look). */
export function AiBubble({ children, delay = 0, first }: { children: ReactNode; delay?: number; first?: boolean }) {
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

export function Typing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-end gap-2.5"
      aria-label={`${brand.guideName} is typing`}
    >
      <SageAvatar size="sm" />
      <span className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </motion.div>
  );
}
