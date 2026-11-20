import { describe, expect, it } from "vitest";
import { redact } from "./logger";

describe("logger redaction", () => {
  it("redacts personal data keys at any depth", () => {
    const out = redact({
      orderId: "o1",
      phone: "+911234567890",
      user: { Email: "a@b.c", id: 7 },
      rows: [{ otp: "123456" }],
    });
    expect(out).toEqual({
      orderId: "o1",
      phone: "[redacted]",
      user: { Email: "[redacted]", id: 7 },
      rows: [{ otp: "[redacted]" }],
    });
  });
  it("does not leak error messages", () => {
    const out = redact({ err: new Error("failed for +911234567890") }) as { err: { message: string } };
    expect(out.err.message).toBe("[redacted]");
  });

  it("keeps stack frames but never the error text that opens a stack (a failed query repeats its parameter values)", () => {
    const err = new Error("Failed query: update auth_user set name = $1\nparams: Asha Verma");
    const out = redact({ err }) as { err: { message: string; stack?: string } };
    expect(out.err.message).toBe("[redacted]");
    expect(out.err.stack).toBeDefined();
    expect(out.err.stack).not.toMatch(/Asha|Failed query|params/);
    expect(out.err.stack).toMatch(/^\s*at /);
  });
});
