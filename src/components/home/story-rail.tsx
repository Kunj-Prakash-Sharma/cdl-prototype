"use client";

import { useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { SampleStory } from "@/content/samples";
import { cn } from "@/lib/format";

// V5 "Students like you" carousel. The only client code on the home page besides the course cards: two arrow buttons
// that scroll a CSS scroll-snap rail. Content is sample data (D92).

const TONES: Record<SampleStory["tone"], { bg: string; text: string; dot: string }> = {
  brand: { bg: "bg-brand-100", text: "text-brand-600", dot: "bg-brand-600" },
  sun: { bg: "bg-sun-100", text: "text-sun-600", dot: "bg-sun-500" },
  success: { bg: "bg-success-50", text: "text-success", dot: "bg-success" },
  teal: { bg: "bg-mist", text: "text-teal", dot: "bg-teal" },
};

const arrowClass =
  "grid size-12 place-items-center rounded-full border-[1.5px] border-line-strong bg-white text-ink transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function StoryRail({ stories, children }: { stories: SampleStory[]; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        {children}
        <div className="flex gap-2.5 max-sm:hidden">
          <button type="button" aria-label="Previous stories" onClick={() => scroll(-1)} className={arrowClass}>
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Next stories" onClick={() => scroll(1)} className={arrowClass}>
            <ArrowRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={rail}
        tabIndex={0}
        role="region"
        aria-label="Student stories"
        className="no-scrollbar -mx-1 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pt-1 pb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {stories.map((s) => {
          const tone = TONES[s.tone];
          return (
            <figure
              key={s.name}
              className="flex w-[clamp(280px,30vw,340px)] flex-none snap-start flex-col overflow-hidden rounded-3xl border border-line bg-white transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none"
            >
              <div className={cn("relative grid h-52 place-items-center overflow-hidden", tone.bg)}>
                <span
                  aria-hidden
                  className={cn("absolute -top-11 -right-9 size-36 rounded-full opacity-15", tone.dot)}
                />
                <span
                  aria-hidden
                  className={cn("absolute -bottom-10 -left-6 size-24 rounded-full opacity-10", tone.dot)}
                />
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-27 place-items-center rounded-full bg-white font-display text-[40px] font-semibold tracking-wide shadow-lift",
                    tone.text,
                  )}
                >
                  {s.initials}
                </span>
                <span className="absolute bottom-3.5 left-3.5 rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-ink">
                  {s.role}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3.5 p-5.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  <span className="rounded-lg bg-mist px-2.5 py-1.5 text-muted">{s.before}</span>
                  <ArrowRight className="size-3.5 text-brand-600" aria-hidden />
                  <span className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-brand-700">{s.after}</span>
                </div>
                <blockquote className="text-base leading-[1.55] text-ink">“{s.quote}”</blockquote>
                <figcaption className="mt-auto text-[15px] font-bold text-ink">{s.name}</figcaption>
              </div>
            </figure>
          );
        })}
      </div>
    </>
  );
}
