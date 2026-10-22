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
  it("names the available adapters when the choice is unknown", () => {
    expect(() => pickAdapter("sms", "nope", adapters, "development")).toThrow(/Available: fake, real/);
  });
});
