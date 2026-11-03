import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import type { StageProgress } from "@/modules/chat/types";

/**
 * The heading above the questions of one part (the prototype's look): a badge, the title, the subtitle, how many are
 * answered, and one bar segment per question. The wording and the counts come from the server, never from this file.
 */
export function StageHeader({ stage, index, count }: { stage: StageProgress; index: number; count: number }) {
  return (
    <header className="mb-6" data-testid="stage-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="brand">
            Part {index + 1} of {count}
          </Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{stage.title}</h1>
          <p className="mt-2 text-slate-600">{stage.subtitle}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-500">
          <span className="text-2xl font-extrabold text-ink">{stage.answered}</span>/{stage.total} answered
        </p>
      </div>
      <div className="mt-5 flex gap-1" aria-hidden>
        {Array.from({ length: stage.total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i < stage.answered ? "bg-brand-300" : i === stage.answered ? "bg-brand-600" : "bg-slate-200",
            )}
          />
        ))}
      </div>
    </header>
  );
}
