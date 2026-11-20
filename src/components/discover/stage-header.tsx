import type { StageProgress } from "@/modules/chat/types";

/**
 * The heading above the questions of one part (V5): which part, how many are answered, the title and the subtitle.
 * The wording and the counts come from the server, never from this file.
 */
export function StageHeader({ stage, index, count }: { stage: StageProgress; index: number; count: number }) {
  return (
    <header className="mb-6" data-testid="stage-header">
      <p className="flex flex-wrap items-center justify-between gap-x-4 text-[13px] font-semibold text-muted">
        <span>
          Part {index + 1} of {count}
        </span>
        <span>
          {stage.answered}/{stage.total} answered
        </span>
      </p>
      <h1 className="mt-2 font-display text-[30px] leading-[1.1] font-normal tracking-[-1px] text-ink sm:text-4xl lg:text-[46px]">
        {stage.title}
      </h1>
      <p className="mt-3 max-w-140 text-[15px] text-body">{stage.subtitle}</p>
      <div className="mt-5 flex gap-1" aria-hidden>
        {Array.from({ length: stage.total }, (_, i) => (
          <span
            key={i}
            className={
              i < stage.answered
                ? "h-2 flex-1 rounded-full bg-brand-600 transition-colors duration-300"
                : "h-2 flex-1 rounded-full bg-brand-100 transition-colors duration-300"
            }
          />
        ))}
      </div>
    </header>
  );
}
