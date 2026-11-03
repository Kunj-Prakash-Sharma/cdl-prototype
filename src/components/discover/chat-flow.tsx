"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { finishAttempt, retake, retryStage, submitAnswer, submitName } from "@/modules/chat/actions";
import type { ResultView } from "@/modules/chat/result";
import type { ChatErrorCode, NextStep, Progress, StageId } from "@/modules/chat/types";
import { ChatCard } from "./chat-card";
import { chatMessage } from "./chat-messages";
import { HelplineLink } from "./helpline-link";
import { QuizStepper } from "./quiz-stepper";
import { ScaleQuestion } from "./scale-question";
import { StageHeader } from "./stage-header";
import { FinishingScreen, ResultPlaceholder, RetryScreen, StopScreen } from "./status-screens";

type View =
  | { type: "step"; step: NextStep }
  | { type: "finishing"; error?: string }
  | { type: "finished"; result: ResultView }
  | { type: "retry"; stage: string }
  | { type: "stopped" };

/** The same progress with every question counted as answered (for the finishing and saved-result screens). */
const asComplete = (progress: Progress): Progress => ({
  ...progress,
  answered: progress.total,
  stages: progress.stages.map((stage) => ({ ...stage, answered: stage.total })),
});

/** Which part a step belongs to: tap questions and the name are "basics", scored questions say their own part. */
const stageOf = (step: NextStep): StageId | null =>
  step.kind === "done" ? null : step.kind === "question" ? step.stage : "basics";

const retryAfter = (res: object) => ("retryAfterSec" in res ? (res.retryAfterSec as number | undefined) : undefined);

/**
 * The whole quiz screen. It draws whatever the server says comes next and sends answers back through the actions.
 * It knows nothing about which questions exist, how many there are, or what the parts are called: all of that is in
 * the step the server returns (decision D68), so changing the question set changes no code here.
 */
export function ChatFlow({
  attemptId: initialAttemptId,
  initial,
  finished,
}: {
  attemptId: string;
  initial: NextStep;
  /** Set when the learner already finished: show the saved result instead of a quiz. */
  finished?: ResultView;
}) {
  const [attemptId, setAttemptId] = useState(initialAttemptId);
  // A learner who reloads with every question answered goes straight to finishing.
  const [view, setView] = useState<View>(
    finished
      ? { type: "finished", result: finished }
      : initial.kind === "done"
        ? { type: "finishing" }
        : { type: "step", step: initial },
  );
  // The last progress the server sent, so the step bar stays on screen during finishing and the saved result.
  const [progress, setProgress] = useState<Progress | null>(finished ? null : initial.progress);
  const [ack, setAck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  /**
   * Runs one server call at a time (a double tap cannot send twice), and turns a crash into a message instead of a
   * silent no-op. Calls that follow each other (an answer, then finishing) happen inside one task.
   */
  const run = (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch {
        setError(chatMessage("unknown"));
      } finally {
        busy.current = false;
      }
    });
  };

  /** The page is out of date (for example the attempt ended in another tab): reload so the server decides what is next. */
  const resync = () => window.location.reload();

  const fail = (code: ChatErrorCode, retryAfterSec?: number) => {
    if (code === "not_found" || code === "attempt_closed") return resync();
    setError(chatMessage(code, retryAfterSec));
  };

  /** Scores the attempt. State changes come after the server answers, never while rendering. */
  const finishNow = async (id: string) => {
    const res = await finishAttempt({ attemptId: id });
    if (res.ok) return setView({ type: "finished", result: res.result });
    if (res.code === "stage_invalid" && res.stage) return setView({ type: "retry", stage: res.stage });
    // Missing answers or an out-of-date page: the server knows where the learner is, so reload.
    if (res.code === "incomplete" || res.code === "not_found" || res.code === "attempt_closed") return resync();
    setView({ type: "finishing", error: chatMessage(res.code, retryAfter(res)) });
  };

  useEffect(() => {
    if (initial.kind === "done" && !finished) run(() => finishNow(attemptId));
    // Only on first load: later finishes are started by an answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Shows the next step, or starts finishing when there is none. `id` is passed in because the attempt can change. */
  const goTo = async (next: NextStep, id: string) => {
    if (next.kind === "done") {
      setView({ type: "finishing" });
      return finishNow(id);
    }
    setProgress(next.progress);
    setView({ type: "step", step: next });
  };

  const answer = (questionId: string, value: number, kind: "basics" | "question") =>
    run(async () => {
      const res = await submitAnswer({ attemptId, questionId, value });
      if (!res.ok) return fail(res.code, retryAfter(res));
      // Meera's reply to a tap question shows above the next card; replies to scale answers would only make the card jump.
      setAck(kind === "basics" ? res.acknowledgement || null : null);
      await goTo(res.next, attemptId);
    });

  const sendName = (name: string) =>
    run(async () => {
      const res = await submitName({ attemptId, name });
      if (res.ok) {
        setAck(null);
        return goTo(res.next, attemptId);
      }
      if (res.code === "name_blocked") return setView({ type: "stopped" });
      fail(res.code, retryAfter(res));
    });

  const retry = (stage: string) =>
    run(async () => {
      const res = await retryStage({ attemptId, stage });
      if (!res.ok) return fail(res.code, retryAfter(res));
      setAck(null);
      await goTo(res.next, attemptId);
    });

  /** "Start again" after the stop screen, and "take it again" after a result: a new attempt (or the open one). */
  const startOver = () =>
    run(async () => {
      const res = await retake();
      if (!res.ok) return fail(res.code, retryAfter(res));
      setAttemptId(res.attemptId);
      setAck(null);
      await goTo(res.next, res.attemptId);
    });

  const step = view.type === "step" ? view.step : null;
  const finishing = view.type === "finishing" || view.type === "finished";
  const shown = progress && finishing ? asComplete(progress) : progress;
  const stageId = step ? stageOf(step) : null;
  const stageIndex = shown && stageId ? shown.stages.findIndex((stage) => stage.id === stageId) : -1;
  const stage = shown && stageIndex >= 0 ? shown.stages[stageIndex]! : null;

  return (
    <div>
      {shown && view.type !== "stopped" && <QuizStepper progress={shown} />}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {shown && stage && <StageHeader stage={stage} index={stageIndex} count={shown.stages.length} />}

        {step && (step.kind === "name" || step.kind === "basics") && (
          <ChatCard
            key={step.id}
            step={step}
            ack={ack}
            error={error}
            pending={pending}
            onName={sendName}
            onChoose={(index) => answer(step.id, index, "basics")}
          />
        )}
        {step && step.kind === "question" && stage && (
          <ScaleQuestion
            step={step}
            stage={stage}
            ack={ack}
            error={error}
            pending={pending}
            onChoose={(value) => answer(step.id, value, "question")}
          />
        )}
        {view.type === "finishing" && (
          <FinishingScreen
            error={view.error ?? error}
            pending={pending}
            onRetry={() => {
              setView({ type: "finishing" });
              run(() => finishNow(attemptId));
            }}
          />
        )}
        {view.type === "retry" && <RetryScreen pending={pending} error={error} onRetry={() => retry(view.stage)} />}
        {view.type === "stopped" && <StopScreen pending={pending} error={error} onRestart={startOver} />}
        {view.type === "finished" && (
          <ResultPlaceholder result={view.result} pending={pending} error={error} onRetake={startOver} />
        )}

        {view.type !== "stopped" && <HelplineLink className="mt-6 justify-center" />}
      </div>
    </div>
  );
}
