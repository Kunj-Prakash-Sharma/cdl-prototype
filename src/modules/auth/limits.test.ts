import { describe, expect, it } from "vitest";
import { DAILY_CAP, LOCK_SEC, RESEND_COOLDOWN_SEC, applyLock, decideSend, type Throttle } from "./limits";

const T0 = new Date("2026-10-28T10:00:00Z");
const after = (base: Date, sec: number) => new Date(base.getTime() + sec * 1000);

function sendAt(state: Throttle | null, at: Date): Throttle {
  const d = decideSend(state, at);
  if (!d.ok) throw new Error(`expected ok, got ${d.code}`);
  return d.next;
}

describe("decideSend", () => {
  it("allows the first send and starts the day window", () => {
    const d = decideSend(null, T0);
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.next).toMatchObject({ sendCount: 1, lastSentAt: T0, windowStart: T0 });
  });

  it("rejects a resend inside the cooldown, with the wait time", () => {
    const s = sendAt(null, T0);
    const d = decideSend(s, after(T0, 10));
    expect(d).toEqual({ ok: false, code: "cooldown", retryAfterSec: RESEND_COOLDOWN_SEC - 10 });
  });

  it("allows a resend once the cooldown has passed", () => {
    const s = sendAt(null, T0);
    expect(decideSend(s, after(T0, RESEND_COOLDOWN_SEC)).ok).toBe(true);
  });

  it(`rejects the ${DAILY_CAP + 1}th code inside a day`, () => {
    let s: Throttle | null = null;
    for (let i = 0; i < DAILY_CAP; i++) s = sendAt(s, after(T0, i * 60));
    const d = decideSend(s, after(T0, DAILY_CAP * 60));
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.code).toBe("daily_limit");
  });

  it("resets the daily count after 24 hours", () => {
    let s: Throttle | null = null;
    for (let i = 0; i < DAILY_CAP; i++) s = sendAt(s, after(T0, i * 60));
    const d = decideSend(s, after(T0, 24 * 60 * 60 + 1));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.next.sendCount).toBe(1);
  });
});

describe("applyLock", () => {
  it("blocks sends until the lock ends, then allows again", () => {
    const locked = applyLock(sendAt(null, T0), after(T0, 5));
    const during = decideSend(locked, after(T0, 100));
    expect(during.ok).toBe(false);
    if (!during.ok) expect(during.code).toBe("locked");
    expect(decideSend(locked, after(T0, 5 + LOCK_SEC + 1)).ok).toBe(true);
  });

  it("locks a number that has no history", () => {
    const d = decideSend(applyLock(null, T0), T0);
    expect(d.ok).toBe(false);
  });
});
