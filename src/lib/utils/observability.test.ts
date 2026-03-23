import { describe, expect, it } from "vitest";
import { shouldEnableSpeedInsights } from "./observability";

describe("shouldEnableSpeedInsights", () => {
  it("returns false in development", () => {
    expect(shouldEnableSpeedInsights("development")).toBe(false);
  });

  it("returns true in production", () => {
    expect(shouldEnableSpeedInsights("production")).toBe(true);
  });
});
