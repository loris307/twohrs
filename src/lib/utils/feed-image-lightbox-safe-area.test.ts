import { describe, expect, it, vi } from "vitest";
import { createFeedImageLightboxSafeAreaInsetsReader } from "./feed-image-lightbox-safe-area";

describe("createFeedImageLightboxSafeAreaInsetsReader", () => {
  it("caches the measured insets until invalidated", () => {
    const measure = vi
      .fn<() => { top: number; right: number; bottom: number; left: number }>()
      .mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });

    const reader = createFeedImageLightboxSafeAreaInsetsReader(measure);

    expect(reader.read()).toEqual({ top: 47, right: 0, bottom: 34, left: 0 });
    expect(reader.read()).toEqual({ top: 47, right: 0, bottom: 34, left: 0 });
    expect(measure).toHaveBeenCalledTimes(1);

    reader.invalidate();
    expect(reader.read()).toEqual({ top: 47, right: 0, bottom: 34, left: 0 });
    expect(measure).toHaveBeenCalledTimes(2);
  });
});
