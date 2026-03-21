import { describe, expect, it } from "vitest";
import { getPostDetailContentClassName } from "./post-detail-layout";

describe("getPostDetailContentClassName", () => {
  it("matches the feed width by avoiding an extra narrow max-width wrapper", () => {
    const className = getPostDetailContentClassName();

    expect(className).toContain("w-full");
    expect(className).toContain("py-4");
    expect(className).not.toContain("max-w-lg");
    expect(className).not.toContain("px-4");
  });
});
