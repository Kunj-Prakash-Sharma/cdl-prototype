"use client";

import { useEffect, useState } from "react";

/** The offer bar's code chip: a tap copies the code and says so for two seconds. */
export function CopyCode({ code, note }: { code: string; note?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () => {
    setCopied(true);
    // Clipboard can be missing or blocked (http, old browser, a pending permission); the code is still visible to type.
    navigator.clipboard?.writeText(code).catch(() => {});
  };

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
        <span aria-live="polite">{copied ? "Copied" : "Tap to copy"}</span>
        {note && ` · ${note}`}
      </span>
    </>
  );
}
