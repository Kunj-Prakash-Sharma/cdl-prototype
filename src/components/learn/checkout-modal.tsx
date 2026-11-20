"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CreditCard,
  Info,
  Landmark,
  LoaderCircle,
  Lock,
  PartyPopper,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { bundlePrice, getCourse, lessonCount, type Course } from "@/modules/catalog/courses";
import { cn, formatPrice } from "@/lib/format";
import { actions, useAppState } from "@/lib/store";
import { CourseThumb } from "./course-thumb";

type Method = "card" | "upi" | "netbanking";
type Phase = "review" | "processing" | "success";

const METHODS: { id: Method; label: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "netbanking", label: "Net banking", icon: Landmark },
];

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
  const { profile, purchases } = useAppState();
  // Snapshot what's being bought when the dialog opens.
  const [courses] = useState(() => slugs.map(getCourse).filter((c): c is Course => !!c && !purchases.includes(c.slug)));
  const [paidCourses, setPaidCourses] = useState<Course[]>([]);
  const [method, setMethod] = useState<Method>("card");
  const [phase, setPhase] = useState<Phase>("review");

  const isBundle = courses.length > 1;
  const listTotal = courses.reduce((n, c) => n + c.listPrice, 0);
  const priceTotal = courses.reduce((n, c) => n + c.price, 0);
  const total = isBundle ? bundlePrice(courses).price : priceTotal;
  const savings = listTotal - total;

  const pay = () => {
    setPhase("processing");
    setTimeout(() => {
      setPaidCourses(courses);
      actions.purchase(courses.map((c) => c.slug));
      setPhase("success");
    }, 1800);
  };

  if (phase === "success") {
    const first = paidCourses[0];
    return (
      <div className="px-6 py-12 text-center sm:px-12">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_16px_40px_-12px_rgb(16_185_129/0.7)]"
        >
          <PartyPopper className="size-9" aria-hidden />
        </motion.div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">You&apos;re enrolled!</h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Full videos, resources and certificates are now unlocked for{" "}
          {paidCourses.length > 1 ? `all ${paidCourses.length} courses` : <strong>{first?.title}</strong>}.
        </p>
        <div className="mx-auto mt-6 max-w-md space-y-2 text-left">
          {paidCourses.map((c) => (
            <div key={c.slug} className="flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-slate-200/70">
              <CourseThumb
                slug={c.slug}
                className="size-12 shrink-0 rounded-xl"
                iconClassName="size-6 bottom-2 right-2"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                <p className="text-xs text-slate-500">
                  {lessonCount(c)} lessons · {c.resources.length} resources unlocked
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {first && (
            <Link
              href={`/learn/${first.slug}`}
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-[15px] font-semibold text-white shadow-glow transition hover:bg-brand-700"
            >
              Start learning <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          <Link
            href="/my-self"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-ink ring-1 ring-slate-200 transition hover:ring-slate-300"
          >
            Go to My Learning
          </Link>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <h2 className="text-2xl font-bold text-ink">
          You already own {slugs.length > 1 ? "these courses" : "this course"}
        </h2>
        <Link href="/my-self" onClick={onClose} className="mt-4 inline-block font-semibold text-brand-700">
          Go to My Learning →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_1.1fr]">
      {/* Order summary */}
      <div className="bg-paper p-6 sm:p-8 md:rounded-l-3xl">
        <p className="text-xs font-bold tracking-[0.16em] text-brand-600 uppercase">
          {isBundle ? "Your learning path" : "Level 1 · Self-paced"}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Order summary</h2>
        <div className="mt-5 space-y-3">
          {courses.map((c) => (
            <div key={c.slug} className="flex items-center gap-3">
              <CourseThumb
                slug={c.slug}
                className="size-14 shrink-0 rounded-xl"
                iconClassName="size-7 bottom-2 right-2"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug font-semibold text-ink">{c.title}</p>
                <p className="text-xs text-slate-500">
                  {c.hours} hrs · {lessonCount(c)} lessons
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-ink">{formatPrice(c.price)}</p>
                <p className="text-xs text-slate-400 line-through">{formatPrice(c.listPrice)}</p>
              </div>
            </div>
          ))}
        </div>
        <dl className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm">
          <div className="flex justify-between text-slate-500">
            <dt>Original price</dt>
            <dd className="line-through">{formatPrice(listTotal)}</dd>
          </div>
          <div className="flex justify-between text-slate-500">
            <dt>Launch discount</dt>
            <dd className="text-emerald-600">−{formatPrice(listTotal - priceTotal)}</dd>
          </div>
          {isBundle && (
            <div className="flex justify-between text-slate-500">
              <dt>Learning path bundle (30%)</dt>
              <dd className="text-emerald-600">−{formatPrice(priceTotal - total)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="text-2xl font-extrabold text-ink">{formatPrice(total)}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          You save {formatPrice(savings)} ({Math.round((savings / listTotal) * 100)}% off)
        </p>
      </div>

      {/* Payment */}
      <div className="relative p-6 sm:p-8">
        <AnimatePresence>
          {phase === "processing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-sm md:rounded-r-3xl"
            >
              <LoaderCircle className="size-10 animate-spin text-brand-600" aria-hidden />
              <p className="font-semibold text-ink">Processing payment…</p>
              <p className="text-xs text-slate-500">Simulated — no money is moving</p>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="pr-10 text-lg font-bold text-ink">Payment method</h3>
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-sun-100 px-3 py-2.5 text-xs text-sun-700">
          <Info className="mt-px size-4 shrink-0" aria-hidden />
          <span>Demo checkout. No real payment is processed and no details are stored.</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2" role="tablist">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={method === m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold ring-1 transition",
                method === m.id
                  ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500"
                  : "text-slate-500 ring-slate-200 hover:ring-slate-300",
              )}
            >
              <m.icon className="size-5" aria-hidden />
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {method === "card" && (
            <>
              <Field label="Name on card" defaultValue={profile.name ? `${profile.name} Demo` : "Demo Learner"} />
              <Field label="Card number" defaultValue="4242 4242 4242 4242" inputMode="numeric" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry" defaultValue="12 / 29" />
                <Field label="CVC" defaultValue="123" inputMode="numeric" />
              </div>
            </>
          )}
          {method === "upi" && <Field label="UPI ID" defaultValue="learner@demo" />}
          {method === "netbanking" && (
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Choose your bank</span>
              <select className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm text-ink ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-400">
                <option>Demo National Bank</option>
                <option>Sample Co-operative Bank</option>
                <option>Prototype Savings Bank</option>
              </select>
            </label>
          )}
        </div>

        <Button size="lg" className="mt-6 w-full" onClick={pay} disabled={phase !== "review"}>
          <Lock className="size-4" aria-hidden /> Pay {formatPrice(total)}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="size-3.5" aria-hidden /> 7-day refund policy · Lifetime access
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        {...props}
        className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm text-ink ring-1 ring-slate-200 transition outline-none focus:ring-2 focus:ring-brand-400"
      />
    </label>
  );
}
