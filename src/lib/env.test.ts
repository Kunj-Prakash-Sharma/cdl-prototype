import { describe, expect, it } from "vitest";
import { parseEnv } from "./env-schema";

describe("parseEnv", () => {
  it("applies defaults and keeps providers on fake", () => {
    const env = parseEnv({ DATABASE_URL: "postgres://x" });
    expect(env.CHAT_INACTIVITY_MINUTES).toBe(30);
    expect(env.SMS_PROVIDER).toBe("fake");
    expect(env.NODE_ENV).toBe("development");
  });
  it("reads the optional SMS daily cap and rejects a bad one", () => {
    expect(parseEnv({ DATABASE_URL: "x" }).SMS_DAILY_CAP).toBeUndefined();
    expect(parseEnv({ DATABASE_URL: "x", SMS_DAILY_CAP: "500" }).SMS_DAILY_CAP).toBe(500);
    expect(() => parseEnv({ DATABASE_URL: "x", SMS_DAILY_CAP: "0" })).toThrow(/SMS_DAILY_CAP/);
  });
  it("fails fast with a readable message when required config is missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
  it("needs auth keys in production only", () => {
    expect(() => parseEnv({ DATABASE_URL: "x" })).not.toThrow();
    expect(() => parseEnv({ DATABASE_URL: "x", NODE_ENV: "production" })).toThrow(/AUTH_SECRET/);
  });
  it("accepts a missing callback alert address, and rejects one that is not an email", () => {
    expect(() => parseEnv({ DATABASE_URL: "x" })).not.toThrow();
    expect(() => parseEnv({ DATABASE_URL: "x", CALLBACK_ALERT_EMAIL: "team@example.com" })).not.toThrow();
    expect(() => parseEnv({ DATABASE_URL: "x", CALLBACK_ALERT_EMAIL: "not-an-email" })).toThrow(/CALLBACK_ALERT_EMAIL/);
  });
  it("rejects a non-numeric chat timeout", () => {
    expect(() => parseEnv({ DATABASE_URL: "x", CHAT_INACTIVITY_MINUTES: "soon" })).toThrow(/CHAT_INACTIVITY_MINUTES/);
  });
});
