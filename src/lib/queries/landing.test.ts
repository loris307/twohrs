import { describe, expect, it, vi } from "vitest";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

describe("getCachedLandingSnapshot", () => {
  it("wraps the public landing snapshot with a versioned 60 second cache", async () => {
    await import("./landing");

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["landing-page-snapshot", "v1"],
      { revalidate: 60 }
    );
  });
});
