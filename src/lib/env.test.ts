import { describe, expect, it } from "vitest";
import { parseEnv } from "./env-schema";

describe("parseEnv", () => {
  it("applies defaults and keeps providers on fake", () => {
    const env = parseEnv({ DATABASE_URL: "postgres://x" });
    expect(env.CHAT_INACTIVITY_MINUTES).toBe(30);
    expect(env.SMS_PROVIDER).toBe("fake");
    expect(env.NODE_ENV).toBe("development");
  });
  it("fails fast with a readable message when required config is missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
  it("needs auth keys in production only", () => {
    expect(() => parseEnv({ DATABASE_URL: "x" })).not.toThrow();
    expect(() => parseEnv({ DATABASE_URL: "x", NODE_ENV: "production" })).toThrow(/AUTH_SECRET/);
  });
  it("rejects a non-numeric chat timeout", () => {
    expect(() => parseEnv({ DATABASE_URL: "x", CHAT_INACTIVITY_MINUTES: "soon" })).toThrow(/CHAT_INACTIVITY_MINUTES/);
  });
});
