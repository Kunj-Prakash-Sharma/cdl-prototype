"use client";

import { useState } from "react";
import { DIMENSIONS, DIMENSION_INFO, type Dimension } from "@/lib/data/discovery";
import { cn } from "@/lib/format";

const SERIES = "#5a45f2"; // brand-600
const GRID = "#e2e8f0"; // slate-200
const SURFACE = "#ffffff";

/** Holland hexagon: one series (the learner), so no legend — the card title names it. */
export function RadarChart({
  scores,
  size = 340,
  showLabels = true,
  interactive = true,
  highlight,
  className,
}: {
  scores: Record<Dimension, number>;
  size?: number;
  showLabels?: boolean;
  interactive?: boolean;
  highlight?: Dimension;
  className?: string;
}) {
  const [hover, setHover] = useState<Dimension | null>(null);
  const pad = showLabels ? 62 : 10;
  const c = size / 2;
  const radius = c - pad;

  const point = (i: number, value: number) => {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    const r = (value / 100) * radius;
    return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
  };

  const ring = (v: number) =>
    DIMENSIONS.map((_, i) => point(i, v))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");

  const shape = DIMENSIONS.map((d, i) => point(i, scores[d]));
  const active = hover ?? highlight ?? null;

  return (
    <div className={cn("relative mx-auto w-full", className)} style={{ maxWidth: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Interest profile radar chart"
      >
        {[25, 50, 75, 100].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" stroke={GRID} strokeWidth={1} />
        ))}
        {DIMENSIONS.map((_, i) => {
          const p = point(i, 100);
          return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke={GRID} strokeWidth={1} />;
        })}

        <polygon
          points={shape.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={SERIES}
          fillOpacity={0.1}
          stroke={SERIES}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {shape.map((p, i) => {
          const d = DIMENSIONS[i];
          return (
            <circle
              key={d}
              cx={p.x}
              cy={p.y}
              r={active === d ? 6 : 4.5}
              fill={SERIES}
              stroke={SURFACE}
              strokeWidth={2}
              className="transition-all duration-200"
            />
          );
        })}

        {showLabels &&
          DIMENSIONS.map((d, i) => {
            const p = point(i, 100);
            const angle = -90 + i * 60;
            const lx = c + (radius + 20) * Math.cos((angle * Math.PI) / 180);
            const ly = c + (radius + 20) * Math.sin((angle * Math.PI) / 180);
            const anchor = Math.abs(lx - c) < 4 ? "middle" : lx > c ? "start" : "end";
            const dy = p.y < c - 4 ? -6 : p.y > c + 4 ? 14 : 4;
            return (
              <text key={d} x={lx} y={ly + dy} textAnchor={anchor} className="select-none">
                <tspan className={cn("text-[12px] font-semibold", active === d ? "fill-ink" : "fill-slate-600")}>
                  {DIMENSION_INFO[d].name}
                </tspan>
                <tspan x={lx} dy={14} className="fill-slate-400 text-[11px]">
                  {scores[d]}
                </tspan>
              </text>
            );
          })}

        {interactive &&
          shape.map((p, i) => {
            const d = DIMENSIONS[i];
            return (
              <circle
                key={`hit-${d}`}
                cx={p.x}
                cy={p.y}
                r={18}
                fill="transparent"
                tabIndex={0}
                aria-label={`${DIMENSION_INFO[d].name}: ${scores[d]} out of 100`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setHover(d)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(d)}
                onBlur={() => setHover(null)}
              />
            );
          })}
      </svg>

      {interactive && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-ink px-3 py-2 text-white shadow-lift"
          style={{
            left: `${(shape[DIMENSIONS.indexOf(hover)].x / size) * 100}%`,
            top: `${(shape[DIMENSIONS.indexOf(hover)].y / size) * 100}%`,
          }}
        >
          <p className="text-xs font-semibold whitespace-nowrap">
            {DIMENSION_INFO[hover].name} · {DIMENSION_INFO[hover].alias}
          </p>
          <p className="mt-0.5 text-lg leading-none font-bold">
            {scores[hover]}
            <span className="text-xs font-medium text-white/60"> / 100</span>
          </p>
        </div>
      )}
    </div>
  );
}
