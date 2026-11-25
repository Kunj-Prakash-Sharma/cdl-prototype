"use client";

import { useEffect, useState } from "react";

/** The offer bar's code chip: a tap copies the code and says so for two seconds. */
export function CopyCode({ code, note }: { code: string; note?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const copy = () => {
    // Clipboard can be missing or blocked (http, old browser, a denied permission): then say so, the code stays visible.
    if (!navigator.clipboard) return setStatus("failed");
    navigator.clipboard.writeText(code).then(
      () => setStatus("copied"),
      () => setStatus("failed"),
    );
  };

  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed, type the code" : "Tap to copy";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy code ${code}`}
        className="inline-flex min-h-11 items-center rounded-lg border-[1.5px] border-dashed border-brand-300 bg-white px-3 font-bold tracking-[0.08em] text-ink transition-colors hover:bg-brand-50 sm:min-h-8"
      >
        {code}
      </button>
      <span className="text-white/75">
        <span aria-live="polite">{label}</span>
        {note && ` · ${note}`}
      </span>
    </>
  );
}
