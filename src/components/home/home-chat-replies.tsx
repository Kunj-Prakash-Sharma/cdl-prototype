"use client";

import { useEffect } from "react";
import Link from "next/link";
import { forgetHomeAnswer, keepHomeAnswer } from "./home-answer";

// The quick replies of the Home preview card (D87). Each is a plain link to /discover (it still works without
// JavaScript); a tap also keeps the option id in this tab so the quiz does not ask the same question again.
// Showing the replies forgets any earlier tap: a learner back on Home did not go on with it.
export function HomeChatReplies({ options }: { options: { id: string; label: string }[] }) {
  useEffect(() => forgetHomeAnswer(), []);
  return (
    <div className="mt-1 flex flex-wrap gap-2" data-testid="home-replies">
      {options.map((o) => (
        <Link
          key={o.id}
          href="/discover"
          onClick={() => keepHomeAnswer(o.id)}
          className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-line-strong bg-white px-4.5 text-sm font-semibold text-ink transition-colors hover:border-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
