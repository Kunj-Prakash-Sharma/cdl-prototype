"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Captions, Check, CirclePlay, Lock, Maximize, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import type { Course, Lesson } from "@/lib/data/courses";
import { cn, formatClock, formatPrice } from "@/lib/format";

/** Simulated seconds of video per real second at 1× — keeps demos snappy. */
const SIM_RATE = 24;
const SPEEDS = [1, 1.5, 2];

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

export function VideoPlayer({ course, lesson, label, locked, hasNext, onComplete, onNext, onUnlock, onPreview }: Props) {
  const duration = lesson.minutes * 60;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const completed = useRef(false);

  const ended = t >= duration;
  const isPlaying = playing && !ended && !locked;

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
    `Welcome back! In this lesson we're covering ${lesson.title.toLowerCase()}.`,
    "Let's start with a quick example from a real project.",
    "Notice how the pattern repeats — that's the key idea to remember.",
    "Pause here and try it yourself before we move on.",
    "Great work. Let's recap what we covered and what's coming next.",
  ];
  const caption = captions[Math.min(captions.length - 1, Math.floor((t / duration) * captions.length))];

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
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "k") {
          e.preventDefault();
          toggle();
        }
      }}
      className="group relative isolate aspect-video w-full overflow-hidden rounded-3xl bg-ink text-white shadow-lift outline-none ring-1 ring-black/5 focus-visible:ring-4 focus-visible:ring-brand-300"
    >
      {/* "Footage" */}
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(135deg, ${course.theme.from}, ${course.theme.to})` }} />
      <div className="absolute inset-0 bg-ink/55" />
      <div className="bg-grid-dark absolute inset-0 opacity-50" />
      <div className={cn("absolute inset-0 transition duration-500", locked && "scale-105 blur-md")}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            {isPlaying && <span className="animate-pulse-ring absolute inset-0 rounded-full bg-white/30" />}
            <span className="relative grid size-16 place-items-center rounded-full bg-white/15 text-xl font-bold ring-2 ring-white/30 backdrop-blur sm:size-24 sm:text-3xl">
              {course.instructor.initials}
            </span>
          </div>
          <div className="flex h-6 items-end gap-1" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={cn("w-1 origin-bottom rounded-full bg-white/70", isPlaying ? "animate-wave" : "scale-y-[0.3]")}
                style={{ height: 24, animationDelay: `${(i % 7) * 0.12}s` }}
              />
            ))}
          </div>
        </div>
        <div
          className={cn(
            "absolute bottom-16 left-4 max-w-[70%] transition-opacity duration-300 sm:bottom-20 sm:left-6",
            cc && isPlaying && "opacity-0",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 sm:text-xs">{label}</p>
          <p className="mt-1 text-base font-bold leading-tight sm:text-2xl">{lesson.title}</p>
        </div>
      </div>

      <div className="absolute left-4 top-4 flex gap-1.5">
        <span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">Simulated video</span>
        {lesson.preview && !locked && (
          <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold">Free preview</span>
        )}
      </div>

      {/* Big play */}
      {!locked && !isPlaying && !ended && (
        <button type="button" onClick={toggle} aria-label="Play lesson" className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-white text-ink shadow-lift transition group-hover:scale-110 sm:size-20">
            <Play className="ml-1 size-7 fill-current sm:size-8" />
          </span>
        </button>
      )}

      {/* Captions */}
      {cc && isPlaying && (
        <p className="absolute inset-x-0 bottom-14 mx-auto w-fit max-w-[85%] rounded-lg bg-black/65 px-3 py-1.5 text-center text-xs sm:bottom-16 sm:text-sm">
          {caption}
        </p>
      )}

      {/* Controls */}
      {!locked && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-linear-to-t from-black/75 to-transparent px-4 pb-3 pt-8 sm:gap-4 sm:px-5">
          <button type="button" onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"} className="shrink-0">
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <span className="shrink-0 text-xs tabular-nums text-white/80">
            {formatClock(t)} / {formatClock(duration)}
          </span>
          <button
            type="button"
            aria-label="Seek"
            className="relative h-5 flex-1 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setT(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
            }}
          >
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25" />
            <span className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white" style={{ width: `${(t / duration) * 100}%` }} />
            <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${(t / duration) * 100}%` }} />
          </button>
          <button
            type="button"
            onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
            className="w-9 shrink-0 rounded-md bg-white/15 py-0.5 text-xs font-bold"
            aria-label="Playback speed"
          >
            {speed}×
          </button>
          <button type="button" onClick={() => setCc((c) => !c)} aria-label="Toggle captions" aria-pressed={cc} className={cn("shrink-0", !cc && "opacity-50")}>
            <Captions className="size-5" />
          </button>
          <button type="button" onClick={() => boxRef.current?.requestFullscreen?.()} aria-label="Fullscreen" className="hidden shrink-0 sm:block">
            <Maximize className="size-5" />
          </button>
        </div>
      )}

      {/* Ended */}
      <AnimatePresence>
        {ended && !locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 backdrop-blur-sm"
          >
            <span className="grid size-14 place-items-center rounded-full bg-emerald-500">
              <Check className="size-7" strokeWidth={3} />
            </span>
            <p className="text-lg font-bold sm:text-xl">Lesson complete</p>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={toggle} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
                <RotateCcw className="size-4" /> Replay
              </button>
              {hasNext && (
                <button type="button" onClick={onNext} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink hover:bg-brand-50">
                  Next lesson <SkipForward className="size-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/55 px-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Lock className="size-6" />
          </span>
          <p className="text-lg font-bold sm:text-2xl">This lesson is part of the full course</p>
          <p className="hidden max-w-md text-sm text-white/70 sm:block">
            Enrol to unlock every video, downloadable resource, the capstone project and your certificate.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onUnlock} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink shadow-lift hover:bg-brand-50">
              <Lock className="size-4" /> Unlock full course · {formatPrice(course.price)}
            </button>
            <button type="button" onClick={onPreview} className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">
              <CirclePlay className="size-4" /> Watch a free preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
