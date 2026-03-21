import { describe, expect, it } from "vitest";
import { INITIAL_COUNTDOWN } from "./use-countdown";

describe("INITIAL_COUNTDOWN", () => {
  it("starts from a deterministic zero state", () => {
    expect(INITIAL_COUNTDOWN).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
  });
});
