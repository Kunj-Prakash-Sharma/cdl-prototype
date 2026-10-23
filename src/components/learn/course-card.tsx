"use client";

import Link from "next/link";
import { CirclePlay, Clock, Layers, Sparkles } from "lucide-react";
import { Badge, ProgressBar, Rating } from "@/components/ui/misc";
import { getCourse, lessonCount } from "@/modules/catalog/courses";
import { cn, formatPrice } from "@/lib/format";
import { useAppState } from "@/lib/store";
import { CourseThumb } from "./course-thumb";

export function CourseCard({
  slug,
  match,
  reason,
  className,
}: {
  slug: string;
  match?: number;
  reason?: string;
  className?: string;
}) {
  const { purchases, progress } = useAppState();
  const course = getCourse(slug);
  if (!course) return null;
  const owned = purchases.includes(slug);
  const total = lessonCount(course);
  const done = progress[slug]?.length ?? 0;

  return (
    <Link
      href={`/learn/${slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200",
        className,
      )}
    >
      <CourseThumb
        slug={slug}
        className="aspect-[16/9]"
        iconClassName="transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
      >
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
          <Badge tone="dark">{course.category}</Badge>
          {match !== undefined && (
            <Badge tone="white">
              <Sparkles className="size-3 text-brand-600" aria-hidden />
              {match}% match
            </Badge>
          )}
        </div>
        {!owned && (
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <CirclePlay className="size-3.5" aria-hidden /> Free preview
          </span>
        )}
      </CourseThumb>

      <div className="flex flex-1 flex-col p-5">
        {reason && <p className="mb-2 text-xs font-semibold text-brand-700">{reason}</p>}
        <h3 className="text-lg leading-snug font-bold tracking-tight text-ink group-hover:text-brand-700">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{course.tagline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <Rating value={course.rating} reviews={course.reviews} className="text-xs" />
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {course.hours} hrs
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3.5" aria-hidden /> {total} lessons
          </span>
        </div>

        <div className="mt-auto pt-5">
          {owned ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <Badge tone="green">Enrolled</Badge>
                <span className="font-medium text-slate-500">
                  {done}/{total} lessons
                </span>
              </div>
              <ProgressBar value={done / total} tone="green" />
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-ink">{formatPrice(course.price)}</span>
                <span className="text-sm text-slate-400 line-through">{formatPrice(course.listPrice)}</span>
              </div>
              <span className="text-xs font-medium text-slate-500">{course.instructor.name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
