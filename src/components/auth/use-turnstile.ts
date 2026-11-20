"use client";

import { useCallback, useEffect, useRef } from "react";

// Cloudflare Turnstile (invisible bot check). A token works once, so every OTP send asks for a fresh one.
// Docs: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 15_000;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile script failed")));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/** Returns a ref for an empty container and `getToken()` which resolves a fresh token (or null on failure). */
export function useTurnstile(siteKey: string) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const pending = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          execution: "execute",
          appearance: "interaction-only",
          callback: (token: string) => pending.current?.(token),
          "error-callback": () => pending.current?.(null),
          "timeout-callback": () => pending.current?.(null),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const getToken = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        const turnstile = window.turnstile;
        const id = widgetId.current;
        if (!turnstile || !id) return resolve(null);
        const timer = setTimeout(() => finish(null), TOKEN_TIMEOUT_MS);
        function finish(token: string | null) {
          clearTimeout(timer);
          pending.current = null;
          resolve(token);
        }
        pending.current = finish;
        turnstile.reset(id);
        turnstile.execute(id);
      }),
    [],
  );

  return { container, getToken };
}
