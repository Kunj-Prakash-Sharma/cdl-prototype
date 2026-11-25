"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { getCourse, lessonCount, type CourseCategory } from "@/modules/catalog/courses";
import { cn, formatPrice } from "@/lib/format";
import { useAppState } from "@/lib/store";

/** Pastel band colour per category (V5 course card). Tokens only. */
const bandTone: Record<CourseCategory, string> = {
  Data: "bg-brand-100",
  Design: "bg-sun-200",
  Technology: "bg-brand-50",
  Business: "bg-sun-100",
  Marketing: "bg-sun-200",
  Finance: "bg-brand-100",
  Communication: "bg-brand-50",
  Sustainability: "bg-sun-100",
};

export function CourseCard({ slug, reason, className }: { slug: string; reason?: string; className?: string }) {
  const { purchases, progress } = useAppState();
  const course = getCourse(slug);
  if (!course) return null;
  const owned = purchases.includes(slug);
  const total = lessonCount(course);
  const done = progress[slug]?.length ?? 0;
  const Icon = course.icon;

  return (
    <Link
      href={`/learn/${slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[20px] border border-line bg-paper text-ink transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-600",
        className,
      )}
    >
      <div
        className={cn(
          "relative isolate flex h-37.5 flex-col justify-between overflow-hidden p-3.5 sm:h-42",
          bandTone[course.category],
        )}
      >
        <Icon className="absolute -right-3 -bottom-4 -z-10 size-36 text-brand-600/15" strokeWidth={1.2} aria-hidden />
        <span className="text-xs font-bold text-ink">
          <span className="rounded-md bg-white/90 px-2 py-1">{course.category}</span>
        </span>
        <span aria-hidden className="grid size-14 place-items-center self-center rounded-full bg-white shadow-soft">
          <Play className="size-5.5 fill-brand-600 text-brand-600" />
        </span>
        <div className="flex items-center justify-between gap-2 text-xs font-bold">
          <span className="rounded-md bg-white/90 px-2 py-1 text-ink">{owned ? "Enrolled" : "Free preview"}</span>
          <span className="rounded-md bg-ink/80 px-2 py-1 text-white">
            {total} lessons · {course.hours} hrs
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {reason && <p className="text-xs font-semibold text-brand-700">{reason}</p>}
        <h3 className="text-[19px] leading-tight font-semibold text-ink">{course.title}</h3>
        <p className="line-clamp-3 text-sm leading-normal text-body">{course.tagline}</p>
        <p className="text-[13px] text-muted">Video course · Watch anytime</p>

        <div className="mt-auto border-t border-line pt-3.5">
          {owned ? (
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-muted">
                  <span>
                    {done} of {total} lessons
                  </span>
                  <span>{Math.round((done / total) * 100)}%</span>
                </div>
                <ProgressBar value={done / total} tone="brand" aria-label={`${course.title} progress`} />
              </div>
              <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-brand-600 px-4 text-sm font-bold text-white transition-colors group-hover:border-brand-800 group-hover:bg-brand-800">
                {done >= total ? "Review course" : done > 0 ? "Continue learning" : "Start learning"}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto flex flex-col leading-tight">
                <span className="text-[13px] text-muted line-through">{formatPrice(course.listPrice)}</span>
                <span className="font-display text-[22px] font-medium text-ink">{formatPrice(course.price)}</span>
              </span>
              <span className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-brand-600 bg-brand-600 px-4 text-sm font-bold text-white transition-colors group-hover:border-brand-800 group-hover:bg-brand-800">
                Buy now
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
