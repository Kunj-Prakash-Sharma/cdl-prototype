import { describe, expect, it } from "vitest";
import { pickAdapter } from "./pick";

describe("pickAdapter", () => {
  const adapters = { fake: () => "fake-adapter", real: () => "real-adapter" };

  it("returns the chosen adapter", () => {
    expect(pickAdapter("sms", "real", adapters, "development")).toBe("real-adapter");
  });
  it("allows fake outside production", () => {
    expect(pickAdapter("sms", "fake", adapters, "development")).toBe("fake-adapter");
  });
  it("refuses fake in production", () => {
    expect(() => pickAdapter("sms", "fake", adapters, "production")).toThrow(/Refusing to use the fake sms/);
  });
  it("still refuses fake in production when the build flag is explicitly off", () => {
    expect(() => pickAdapter("sms", "fake", adapters, "production", false)).toThrow(/Refusing to use the fake sms/);
  });
  it("lets `next build` import the fake adapter (it only prerenders, nothing is sent)", () => {
    expect(pickAdapter("sms", "fake", adapters, "production", true)).toBe("fake-adapter");
  });
  it("reads the build phase from NEXT_PHASE by default", () => {
    const before = process.env.NEXT_PHASE;
    try {
      process.env.NEXT_PHASE = "phase-production-build";
      expect(pickAdapter("sms", "fake", adapters, "production")).toBe("fake-adapter");
      process.env.NEXT_PHASE = "phase-production-server";
      expect(() => pickAdapter("sms", "fake", adapters, "production")).toThrow(/Refusing to use the fake sms/);
    } finally {
      if (before === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = before;
    }
  });
  it("names the available adapters when the choice is unknown", () => {
    expect(() => pickAdapter("sms", "nope", adapters, "development")).toThrow(/Available: fake, real/);
  });
});
