import { cn } from "@/lib/format";

// Pieces shared by the screen report (report-view.tsx) and the print document (report-print.tsx).

// Colour per interest type and trait: tokens only. Full class names so Tailwind can see them.
export const TYPE_BG: Record<string, string> = {
  R: "bg-sun-600",
  I: "bg-brand-600",
  A: "bg-brand-400",
  S: "bg-teal",
  E: "bg-sun-500",
  C: "bg-brand-900",
};
export const TRAIT_BG: Record<string, string> = {
  O: "bg-brand-600",
  C: "bg-teal",
  E: "bg-sun-500",
  A: "bg-success",
  N: "bg-brand-400",
};
export const RADAR_ORDER = ["R", "I", "A", "S", "E", "C"] as const;

export function Letter({ letter, bg, size = "md" }: { letter: string; bg: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center font-display font-semibold text-white [print-color-adjust:exact]",
        bg,
        size === "sm" && "size-8 rounded-[10px] text-[15px]",
        size === "md" && "size-[38px] rounded-xl text-lg",
        size === "lg" && "size-[52px] rounded-2xl text-[26px] shadow-lift",
      )}
    >
      {letter}
    </span>
  );
}

/** Radar of the six interest scores, drawn on the server (no script). The list beside it carries the same numbers. */
export function Radar({ scores }: { scores: Record<string, number> }) {
  const point = (i: number, r: number) => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    return [150 + r * Math.cos(angle), 150 + r * Math.sin(angle)] as const;
  };
  const fmt = (p: readonly [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const ring = (r: number) => RADAR_ORDER.map((_, i) => fmt(point(i, r))).join(" ");
  const shape = RADAR_ORDER.map((t, i) => fmt(point(i, (110 * Math.max(4, scores[t] ?? 0)) / 100))).join(" ");
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Radar chart of your six interest scores"
        className="size-full overflow-visible"
      >
        {[36, 73, 110].map((r) => (
          <polygon key={r} points={ring(r)} fill="none" className="stroke-line-strong" strokeWidth="1" />
        ))}
        <polygon
          points={shape}
          className="fill-brand-600/15 stroke-brand-600"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      {RADAR_ORDER.map((t, i) => {
        const [x, y] = point(i, 138);
        return (
          <span
            key={t}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-body sm:text-xs"
            style={{ left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%` }}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}
