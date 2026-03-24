import { describe, expect, it } from "vitest";
import { renderTextWithMentions } from "./render-mentions";

describe("renderTextWithMentions", () => {
  it("returns an empty array for null text instead of throwing", () => {
    expect(renderTextWithMentions(null)).toEqual([]);
  });
});
