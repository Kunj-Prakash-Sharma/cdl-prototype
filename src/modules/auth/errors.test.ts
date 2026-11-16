import { describe, expect, it } from "vitest";
import { SEND_FAILED, THROTTLED, mapSendFailure, mapSignInFailure, mapVerifyFailure } from "./errors";

describe("mapSendFailure", () => {
  it("decodes our throttle messages with the wait time", () => {
    expect(mapSendFailure(429, { code: THROTTLED, message: "cooldown:23" })).toEqual({
      code: "cooldown",
      retryAfterSec: 23,
    });
    expect(mapSendFailure(429, { code: THROTTLED, message: "daily_limit:3600" })).toEqual({
      code: "daily_limit",
      retryAfterSec: 3600,
    });
    expect(mapSendFailure(429, { code: THROTTLED, message: "locked:900" })).toEqual({
      code: "locked",
      retryAfterSec: 900,
    });
    expect(mapSendFailure(429, { code: THROTTLED, message: "sms_cutoff:7200" })).toEqual({
      code: "sms_cutoff",
      retryAfterSec: 7200,
    });
  });
  it("falls back to unknown for a garbled throttle message", () => {
    expect(mapSendFailure(429, { code: THROTTLED, message: "weird" })).toEqual({ code: "unknown" });
  });
  it("maps SMS provider failure", () => {
    expect(mapSendFailure(500, { code: SEND_FAILED, message: "send_failed" })).toEqual({ code: "send_failed" });
  });
  it("maps every captcha failure to captcha_failed", () => {
    for (const code of ["VERIFICATION_FAILED", "MISSING_RESPONSE", "UNKNOWN_ERROR"]) {
      expect(mapSendFailure(400, { code }).code).toBe("captcha_failed");
    }
  });
  it("maps Better Auth's own 429 to ip_limit and reads Retry-After", () => {
    expect(mapSendFailure(429, { message: "Too many requests. Please try again later." }, "120")).toEqual({
      code: "ip_limit",
      retryAfterSec: 120,
    });
    expect(mapSendFailure(429, null, null)).toEqual({ code: "ip_limit" });
  });
  it("maps an invalid phone and anything else", () => {
    expect(mapSendFailure(400, { code: "INVALID_PHONE_NUMBER" }).code).toBe("invalid_phone");
    expect(mapSendFailure(500, null).code).toBe("unknown");
  });
});

describe("mapVerifyFailure", () => {
  it.each([
    ["INVALID_OTP", "bad_code"],
    ["OTP_EXPIRED", "expired"],
    ["OTP_NOT_FOUND", "expired"],
    ["TOO_MANY_ATTEMPTS", "locked"],
    ["INVALID_PHONE_NUMBER", "invalid_phone"],
    ["SOMETHING_ELSE", "unknown"],
  ])("%s -> %s", (code, expected) => {
    expect(mapVerifyFailure({ code }).code).toBe(expected);
  });
  it("handles an empty body", () => {
    expect(mapVerifyFailure(null).code).toBe("unknown");
  });
});

describe("mapSignInFailure", () => {
  it("gives an unknown email and a wrong password the same code", () => {
    expect(mapSignInFailure(401, { code: "INVALID_EMAIL_OR_PASSWORD" })).toEqual({ code: "bad_credentials" });
    expect(mapSignInFailure(400, { code: "INVALID_EMAIL" })).toEqual({ code: "bad_credentials" });
  });
  it("maps a failed bot check, the per-IP limit and anything else", () => {
    expect(mapSignInFailure(403, { code: "VERIFICATION_FAILED" }).code).toBe("captcha_failed");
    expect(mapSignInFailure(429, null, "42")).toEqual({ code: "ip_limit", retryAfterSec: 42 });
    expect(mapSignInFailure(429, null).code).toBe("ip_limit");
    expect(mapSignInFailure(500, { code: "SOMETHING_ELSE" }).code).toBe("unknown");
    expect(mapSignInFailure(500, null).code).toBe("unknown");
  });
});
