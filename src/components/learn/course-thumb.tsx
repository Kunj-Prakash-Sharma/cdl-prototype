import { getCourse } from "@/modules/catalog/courses";
import { cn } from "@/lib/format";

/** Generated cover art for a course — gradient, grid and icon, no image assets needed. */
export function CourseThumb({
  slug,
  className,
  iconClassName,
  children,
}: {
  slug: string;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  const course = getCourse(slug);
  if (!course) return null;
  const Icon = course.icon;
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${course.theme.from}, ${course.theme.to})` }}
    >
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="absolute -right-10 -bottom-16 size-48 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -top-10 -left-8 size-32 rounded-full bg-black/10 blur-xl" />
      <Icon
        className={cn("absolute right-4 bottom-4 size-16 text-white/85 drop-shadow-lg", iconClassName)}
        strokeWidth={1.4}
        aria-hidden
      />
      {children}
    </div>
  );
}
