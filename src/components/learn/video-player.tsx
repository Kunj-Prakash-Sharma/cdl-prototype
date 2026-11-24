"use client";

import { useEffect, useRef, useState } from "react";
import {
  Captions,
  Check,
  Lock,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Course, Lesson } from "@/modules/catalog/courses";
import { Button } from "@/components/ui/button";
import { cn, formatClock, formatPrice } from "@/lib/format";

/** Simulated seconds of video per real second at 1× (sample videos, D67) — keeps demos snappy. */
const SIM_RATE = 24;
const SPEEDS = [1, 1.5, 2];
/** Arrow keys on the seek bar skip this many seconds; the ±10 buttons skip 10. */
const KEY_SKIP = 5;
/** Up/Down arrows change the volume by this much (YouTube uses 5%). */
const VOLUME_STEP = 0.05;
/** Outline pill on the navy player (the ui/button variants are for light backgrounds). */
const OUTLINE_ON_DARK =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-white/35 px-4 text-sm font-bold whitespace-nowrap text-white transition-colors hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400";

type Props = {
  course: Course;
  lesson: Lesson;
  label: string;
  locked: boolean;
  hasNext: boolean;
  onComplete: () => void;
  onNext: () => void;
  onUnlock: () => void;
  onPreview: () => void;
};

/** V5 course player (row 9): a navy stage with gold accents (logo colours, D94), lesson title, pill play button, seek bar. */
export function VideoPlayer({
  course,
  lesson,
  label,
  locked,
  hasNext,
  onComplete,
  onNext,
  onUnlock,
  onPreview,
}: Props) {
  const duration = lesson.minutes * 60;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const completed = useRef(false);

  const ended = t >= duration;
  const isPlaying = playing && !ended && !locked;
  const pct = (t / duration) * 100;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setT((x) => Math.min(duration, x + 0.1 * SIM_RATE * speed)), 100);
    return () => clearInterval(id);
  }, [isPlaying, speed, duration]);

  useEffect(() => {
    if (ended && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [ended, onComplete]);

  const captions = [
    `Welcome. In this lesson we look at ${lesson.title.toLowerCase()}.`,
    "Here is the core idea in plain words: one point, one reason, one example.",
    "Let us walk through a worked example together, step by step.",
    "To recap: pause the video, say it out loud once, then try it with your own example.",
  ];
  const caption = captions[Math.min(captions.length - 1, Math.floor((t / duration) * captions.length))];

  // Volume (the sample videos are simulated, so this is UI state only until `video` exists).
  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const setVolume = (v: number) => {
    const next = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
    setVolumeState(next);
    setMuted(next === 0);
  };
  const toggleMute = () => {
    if (!silent) return setMuted(true);
    setMuted(false);
    if (volume === 0) setVolumeState(0.5);
  };

  const seekBy = (seconds: number) => setT((x) => Math.max(0, Math.min(duration, x + seconds)));
  const toggle = () => {
    if (locked) return;
    if (ended) {
      setT(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  };

  return (
    <div
      ref={boxRef}
      onKeyDown={(e) => {
        // YouTube keys while focus is in the player: Space/K play-pause, M mute, Up/Down volume. Buttons and the volume
        // slider keep their own keys.
        const onControl = e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement;
        const key = e.key.toLowerCase();
        if ((key === " " || key === "k") && !onControl) {
          e.preventDefault();
          toggle();
        } else if (key === "m") {
          toggleMute();
        } else if ((key === "arrowup" || key === "arrowdown") && !onControl) {
          e.preventDefault();
          setVolume((silent ? 0 : volume) + (key === "arrowup" ? VOLUME_STEP : -VOLUME_STEP));
        }
      }}
      className="relative isolate aspect-video min-h-64 w-full overflow-hidden rounded-[22px] bg-brand-950 text-white shadow-glow sm:rounded-[28px]"
    >
      <div
        aria-hidden
        className="absolute right-[-8%] bottom-[-34%] -z-10 aspect-square w-[46%] rounded-full bg-brand-900"
      />
      <p className="absolute top-4 left-4 z-10 text-[11px] font-bold tracking-[0.14em] text-sun-400 uppercase sm:top-6.5 sm:left-7.5 sm:text-xs">
        {label}
      </p>

      {!locked && (
        <>
          {/* The whole stage plays and pauses on click, like YouTube; the control bar has the visible Play button. */}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play lesson"}
            className="absolute inset-0 flex cursor-pointer items-center justify-center px-6 pt-8 pb-24 text-center"
          >
            <span className="max-w-170 font-display text-[clamp(20px,3.2vw,44px)] leading-[1.12] font-medium tracking-[-1px]">
              {lesson.title}
            </span>
          </button>

          {/* Controls */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-b from-transparent to-brand-950 to-55% px-3 pt-6 pb-2 sm:px-6.5 sm:pb-3.5">
            {cc && isPlaying && (
              <p className="pointer-events-none absolute inset-x-0 bottom-22 text-center">
                <span className="inline-block max-w-[80%] rounded-lg bg-black/70 px-3 py-1.5 text-xs leading-snug sm:text-[15px]">
                  {caption}
                </span>
              </p>
            )}
            <div
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(t)}
              aria-valuetext={`${formatClock(t)} of ${formatClock(duration)}`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setT(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  seekBy(e.key === "ArrowLeft" ? -KEY_SKIP : KEY_SKIP);
                } else if (e.key === "Home" || e.key === "End") {
                  e.preventDefault();
                  setT(e.key === "Home" ? 0 : duration);
                }
              }}
              className="relative mb-1 h-6 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-sun-400"
            >
              <span className="absolute inset-x-0 top-1/2 h-1.25 -translate-y-1/2 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full bg-sun-400" style={{ width: `${pct}%` }} />
              </span>
              <span
                aria-hidden
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-3 ring-sun-400/40"
                style={{ left: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ControlButton label={isPlaying ? "Pause" : "Play"} onClick={toggle}>
                {isPlaying ? <Pause className="size-4.5 fill-current" /> : <Play className="size-4.5 fill-current" />}
              </ControlButton>
              <ControlButton label="Back 10 seconds" onClick={() => seekBy(-10)}>
                <RotateCcw className="size-4.5" />
              </ControlButton>
              <ControlButton label="Forward 10 seconds" onClick={() => seekBy(10)}>
                <RotateCw className="size-4.5" />
              </ControlButton>
              {/* Volume, YouTube style: the slider slides out on hover or keyboard focus (tablet and desktop only; phones use the device keys and have no room). */}
              <div className="group/vol hidden items-center sm:flex">
                <ControlButton label={silent ? "Unmute" : "Mute"} onClick={toggleMute}>
                  <VolumeIcon className="size-4.5" />
                </ControlButton>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={silent ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  aria-valuetext={`${Math.round((silent ? 0 : volume) * 100)}%`}
                  className="h-11 w-0 cursor-pointer accent-sun-400 opacity-0 transition-all duration-200 group-focus-within/vol:mx-1 group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 group-hover/vol:mx-1 group-hover/vol:w-20 group-hover/vol:opacity-100 motion-reduce:transition-none"
                />
              </div>
              <span className="ml-1 text-xs whitespace-nowrap tabular-nums sm:ml-2 sm:text-sm">
                {formatClock(t)} / {formatClock(duration)}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                aria-label="Playback speed"
                className="h-11 min-w-11 cursor-pointer rounded-full px-2.5 text-sm font-bold transition-colors hover:bg-white/15"
              >
                {speed}×
              </button>
              <ControlButton label="Captions" onClick={() => setCc((c) => !c)} pressed={cc}>
                <Captions className="size-4.5" />
              </ControlButton>
              <ControlButton
                label="Full screen"
                onClick={() => boxRef.current?.requestFullscreen?.()}
                className="hidden sm:grid"
              >
                <Maximize className="size-4.5" />
              </ControlButton>
            </div>
          </div>
        </>
      )}

      {/* Finished: replay or go on */}
      {ended && !locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-brand-950/85 px-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-success">
            <Check className="size-7" strokeWidth={3} aria-hidden />
          </span>
          <p className="font-display text-xl font-medium sm:text-2xl">Lesson complete</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={toggle} className={OUTLINE_ON_DARK}>
              <RotateCcw className="size-4" aria-hidden /> Replay
            </button>
            {hasNext && (
              <Button size="sm" variant="sun" onClick={onNext}>
                Next lesson <SkipForward className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 pt-6 text-center sm:gap-3.5 sm:pt-0">
          <span aria-hidden className="hidden size-17.5 place-items-center rounded-full bg-brand-800 sm:grid">
            <Lock className="size-6 text-sun-400" />
          </span>
          <p className="max-w-140 font-display text-[clamp(20px,3vw,38px)] leading-[1.15] font-medium tracking-[-0.8px]">
            {lesson.title}
          </p>
          <p className="hidden max-w-120 text-base leading-normal text-white/85 sm:block">
            This lesson unlocks with the full course. The free preview lessons are open to everyone.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5 sm:mt-2.5 sm:gap-3">
            <Button size="sm" variant="sun" onClick={onUnlock} className="sm:min-h-12 sm:px-5.5 sm:text-base">
              Unlock for {formatPrice(course.price)}
            </Button>
            <button
              type="button"
              onClick={onPreview}
              className={cn(OUTLINE_ON_DARK, "sm:min-h-12 sm:px-5.5 sm:text-base")}
            >
              Watch free lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-sun-400",
        pressed && "bg-white/20",
        className,
      )}
    >
      {children}
    </button>
  );
}
