"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { bundlePrice, getCourse, lessonCount, type Course } from "@/modules/catalog/courses";
import { formatPrice } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { CourseThumb } from "./course-thumb";

type Phase = "review" | "processing" | "success";

/**
 * V5 checkout, review step only (D92): no payment method, card or bank fields on our pages. The real payment opens on
 * the provider's hosted page once `commerce` exists; until then "Pay" unlocks the course in this browser's demo store.
 */
export function CheckoutModal({ open, onClose, slugs }: { open: boolean; onClose: () => void; slugs: string[] }) {
  return (
    <Modal open={open} onClose={onClose} label="Checkout">
      {/* Mounted per open so each checkout starts fresh; no key, so a purchase
          that changes `slugs` doesn't reset the success screen. */}
      {open && <CheckoutBody slugs={slugs} onClose={onClose} />}
    </Modal>
  );
}

function CheckoutBody({ slugs, onClose }: { slugs: string[]; onClose: () => void }) {
  const { purchases } = useAppState();
  // Snapshot what's being bought when the dialog opens.
  const [courses] = useState(() => slugs.map(getCourse).filter((c): c is Course => !!c && !purchases.includes(c.slug)));
  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [phase, setPhase] = useState<Phase>("review");

  const isBundle = courses.length > 1;
  const listTotal = courses.reduce((n, c) => n + c.listPrice, 0);
  const priceTotal = courses.reduce((n, c) => n + c.price, 0);
  const total = isBundle ? bundlePrice(courses).price : priceTotal;

  // Closing the dialog unmounts this body; clearing the timer then cancels a purchase the learner backed out of.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pay = () => {
    setPhase("processing");
    timer.current = setTimeout(() => {
      setPaidCourses(courses);
      actions.purchase(courses.map((c) => c.slug));
      setPhase("success");
    }, 1500);
  };

  if (phase === "success") {
    const first = paidCourses[0];
    return (
      <div className="px-6 py-12 text-center sm:px-12">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="mx-auto grid size-18 place-items-center rounded-full bg-success-50 text-success"
        >
          <Check className="size-8" strokeWidth={3} aria-hidden />
        </motion.span>
        <h2 className="mt-5 font-display text-3xl font-normal tracking-[-0.5px] text-ink">
          You&apos;re <span className="text-brand-600">enrolled.</span>
        </h2>
        <p className="mx-auto mt-2 max-w-md text-body">
          Every lesson and resource is now unlocked for{" "}
          {paidCourses.length > 1 ? `all ${paidCourses.length} courses` : <strong>{first?.title}</strong>}.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {first && (
            <ButtonLink href={`/learn/${first.slug}`} onClick={onClose}>
              Start learning
            </ButtonLink>
          )}
          <ButtonLink href="/my-self" variant="secondary" onClick={onClose}>
            Go to My Learning
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <h2 className="font-display text-2xl font-normal text-ink">
          You already own {slugs.length > 1 ? "these courses" : "this course"}
        </h2>
        <ButtonLink href="/my-self" variant="secondary" onClick={onClose} className="mt-5">
          Go to My Learning
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="relative p-6 sm:p-8">
      <AnimatePresence>
        {phase === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[28px] bg-white/90 backdrop-blur-sm"
          >
            <LoaderCircle className="size-10 animate-spin text-brand-600" aria-hidden />
            <p className="font-display text-xl font-medium text-ink">Confirming your order…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="pr-10 text-xs font-bold tracking-[1.2px] text-muted uppercase">Order summary</p>
      <div className="mt-4 space-y-3">
        {courses.map((c) => (
          <div key={c.slug} className="flex items-center gap-3">
            <CourseThumb
              slug={c.slug}
              className="size-14 shrink-0 rounded-xl"
              iconClassName="size-7 bottom-2 right-2"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug font-semibold text-ink">{c.title}</p>
              <p className="text-[13px] text-muted">
                {lessonCount(c)} lessons · {c.hours} hrs
              </p>
            </div>
            <p className="text-[15px] font-semibold text-ink">{formatPrice(c.listPrice)}</p>
          </div>
        ))}
      </div>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
        <div className="flex justify-between text-body">
          <dt>Launch discount</dt>
          <dd className="font-semibold text-success">−{formatPrice(listTotal - priceTotal)}</dd>
        </div>
        {isBundle && (
          <div className="flex justify-between text-body">
            <dt>Learning path bundle</dt>
            <dd className="font-semibold text-success">−{formatPrice(priceTotal - total)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-3 font-display">
          <dt className="text-[22px] font-medium text-ink">Total</dt>
          <dd className="text-[22px] font-medium text-ink">{formatPrice(total)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sun-100 px-3.5 py-3 text-[13px] leading-normal text-sun-700">
        <Info className="mt-px size-4 shrink-0" aria-hidden />
        <span>You pay on our payment partner&apos;s secure page. Your card or bank details never reach us.</span>
      </p>

      <Button size="lg" className="mt-5 w-full" onClick={pay} disabled={phase !== "review"}>
        <Lock className="size-4" aria-hidden /> Pay {formatPrice(total)}
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted">
        <ShieldCheck className="size-3.5" aria-hidden /> 7-day refund policy · Lifetime access
      </p>
      {/* Until `commerce` exists (D92) nothing is charged; say so, so nobody mistakes the demo for a real order. */}
      <p className="mt-2 text-center text-xs text-muted">
        Demo checkout: no money moves. Pay unlocks the course in this browser.
      </p>
    </div>
  );
}
