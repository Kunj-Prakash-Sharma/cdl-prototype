"use client";

import { useSyncExternalStore } from "react";
import { APTITUDE_QUESTIONS, LIKERT_ITEMS } from "@/modules/chat/questions";

/**
 * Local, demo-only app state. Everything lives in localStorage so the
 * prototype can simulate a full journey (discovery → results → purchase)
 * without a backend.
 */

export type Stage = "intro" | "about" | "personality" | "aptitude" | "values" | "analyzing" | "results";

export type Profile = {
  name: string;
  stage: string;
  background: string;
  interests: string[];
  strengths: string[];
  goal: string;
};

export type AppState = {
  version: 1;
  stage: Stage;
  chatStep: number;
  profile: Partial<Profile>;
  likert: Record<string, number>;
  aptitude: Record<string, number>;
  values: string[];
  completedAt: string | null;
  purchases: string[];
  progress: Record<string, string[]>;
};

const STORAGE_KEY = "self-cdl-demo-v1";

export const DEFAULT_STATE: AppState = {
  version: 1,
  stage: "intro",
  chatStep: 0,
  profile: {},
  likert: {},
  aptitude: {},
  values: [],
  completedAt: null,
  purchases: [],
  progress: {},
};

let state: AppState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return parsed.version === 1 ? { ...DEFAULT_STATE, ...parsed } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage();
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  state = readStorage();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

function getServerSnapshot() {
  return DEFAULT_STATE;
}

export function setAppState(update: (s: AppState) => AppState) {
  ensureLoaded();
  state = update(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the session still works in memory.
  }
  emit();
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once running on the client. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const actions = {
  setStage(stage: Stage) {
    setAppState((s) => ({ ...s, stage }));
  },
  answerChat<K extends keyof Profile>(key: K, value: Profile[K]) {
    setAppState((s) => ({ ...s, profile: { ...s.profile, [key]: value }, chatStep: s.chatStep + 1 }));
  },
  chatBack() {
    setAppState((s) => ({ ...s, chatStep: Math.max(0, s.chatStep - 1) }));
  },
  answerLikert(id: string, value: number) {
    setAppState((s) => ({ ...s, likert: { ...s.likert, [id]: value } }));
  },
  answerAptitude(id: string, choice: number) {
    setAppState((s) => ({ ...s, aptitude: { ...s.aptitude, [id]: choice } }));
  },
  setValues(values: string[]) {
    setAppState((s) => ({ ...s, values }));
  },
  completeDiscovery() {
    setAppState((s) => ({ ...s, stage: "results", completedAt: new Date().toISOString() }));
  },
  restartDiscovery() {
    setAppState((s) => ({ ...DEFAULT_STATE, purchases: s.purchases, progress: s.progress, stage: "about" }));
  },
  fillDemoAnswers() {
    const likert: Record<string, number> = {};
    const demo: Record<string, number> = { I: 5, A: 4, S: 4, E: 3, C: 3, R: 2 };
    LIKERT_ITEMS.forEach((item, i) => {
      likert[item.id] = Math.max(1, Math.min(5, demo[item.dim] + (i % 3 === 0 ? 0 : i % 2 === 0 ? -1 : 0)));
    });
    const aptitude: Record<string, number> = {};
    APTITUDE_QUESTIONS.forEach((q, i) => {
      aptitude[q.id] = i === 3 ? (q.answer + 1) % q.options.length : q.answer;
    });
    setAppState((s) => ({
      ...s,
      stage: "analyzing",
      chatStep: 6,
      profile: {
        name: "Aarav",
        stage: "ug",
        background: "engineering",
        interests: ["tech", "data", "design"],
        strengths: ["problem", "creative", "explain"],
        goal: "first-job",
      },
      likert,
      aptitude,
      values: ["growth", "creativity", "impact"],
    }));
  },
  purchase(slugs: string[]) {
    setAppState((s) => ({ ...s, purchases: Array.from(new Set([...s.purchases, ...slugs])) }));
  },
  completeLesson(slug: string, lessonId: string) {
    setAppState((s) => {
      const done = s.progress[slug] ?? [];
      if (done.includes(lessonId)) return s;
      return { ...s, progress: { ...s.progress, [slug]: [...done, lessonId] } };
    });
  },
  resetEverything() {
    setAppState(() => DEFAULT_STATE);
  },
};
