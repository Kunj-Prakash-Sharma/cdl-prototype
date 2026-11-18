import { sampleLaunchOffer } from "@/content/samples";
import type { Progress } from "@/modules/chat/types";

/**
 * The side panel next to the quiz on desktop (V5): how far along, the launch offer, and a privacy line. Phones skip it
 * (the step bar already shows the percentage). The offer is sample content (D82); the V5 "minutes left" estimate and
 * the "How we score" link are not built (no timing data, no page yet).
 */
export function QuizRail({ progress }: { progress: Progress }) {
  const percent = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;
  return (
    <aside aria-label="Discovery progress" className="sticky top-[88px] hidden w-80 shrink-0 flex-col gap-3.5 lg:flex">
      <div className="rounded-[20px] border border-line bg-white px-5.5 py-5">
        <p className="text-[13px] font-semibold text-muted">
          {progress.answered} of {progress.total} answered
        </p>
        <p className="mt-1 mb-3.5 font-display text-[30px] leading-[1.1] font-medium tracking-[-0.5px] text-ink">
          {percent}% done
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden>
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="rounded-[20px] bg-brand-900 px-5.5 py-4.5 text-white">
        <p className="text-xs font-bold tracking-[1.2px] text-sun-400 uppercase">{sampleLaunchOffer.label}</p>
        <p className="mt-1.5 text-[17px] leading-snug font-bold">
          Full report <span className="font-semibold text-brand-200 line-through">{sampleLaunchOffer.before}</span>{" "}
          {sampleLaunchOffer.free.toLowerCase()} right now
        </p>
      </div>
      <p className="px-1 text-sm leading-relaxed text-muted">Your answers are private.</p>
    </aside>
  );
}
