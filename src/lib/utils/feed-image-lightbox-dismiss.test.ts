import { describe, expect, it, vi } from "vitest";
import { dismissFeedImageLightbox } from "./feed-image-lightbox-dismiss";

describe("dismissFeedImageLightbox", () => {
  it("prevents the click from reaching the post card before closing the lightbox", () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const close = vi.fn();

    dismissFeedImageLightbox(
      {
        preventDefault,
        stopPropagation,
      },
      close
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
