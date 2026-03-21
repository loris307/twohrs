import { describe, expect, it } from "vitest";
import {
  FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS,
  getFeedImageLightboxMotionStyle,
  getFeedImageLightboxPresentation,
  getFeedImageLightboxTargetRect,
  getFeedImageLightboxViewportRect,
} from "./feed-image-lightbox";

describe("getFeedImageLightboxPresentation", () => {
  it("uses a visible blurred veil and full-size image state when open", () => {
    expect(getFeedImageLightboxPresentation(true)).toEqual({
      overlayClassName: expect.stringContaining("opacity-100"),
    });

    expect(getFeedImageLightboxPresentation(true).overlayClassName).toContain("backdrop-blur-sm");
  });

  it("uses a transparent veil and slightly shrunken image state when closed", () => {
    expect(getFeedImageLightboxPresentation(false)).toEqual({
      overlayClassName: expect.stringContaining("opacity-0"),
    });

    expect(getFeedImageLightboxPresentation(false).overlayClassName).toContain("backdrop-blur-none");
  });
});

describe("FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS", () => {
  it("keeps the close timeout aligned with the UI transition timing", () => {
    expect(FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS).toBe(200);
  });
});

describe("getFeedImageLightboxTargetRect", () => {
  it("fits a landscape image into the viewport and centers it", () => {
    expect(
      getFeedImageLightboxTargetRect({
        viewportLeft: 0,
        viewportWidth: 1200,
        viewportTop: 0,
        viewportHeight: 900,
        contentWidth: 800,
        contentHeight: 600,
        insetTop: 0,
        insetRight: 0,
        insetBottom: 0,
        insetLeft: 0,
        padding: 16,
      })
    ).toEqual({
      width: 984,
      height: 738,
      left: 108,
      top: 81,
    });
  });

  it("fits a tall image by height without overflowing the viewport", () => {
    const rect = getFeedImageLightboxTargetRect({
      viewportLeft: 0,
      viewportWidth: 390,
      viewportTop: 0,
      viewportHeight: 844,
      contentWidth: 600,
      contentHeight: 1200,
      insetTop: 0,
      insetRight: 0,
      insetBottom: 0,
      insetLeft: 0,
      padding: 16,
    });

    expect(rect.width).toBeCloseTo(346.04, 2);
    expect(rect.height).toBeCloseTo(692.08, 2);
    expect(rect.left).toBeCloseTo(21.98, 2);
    expect(rect.top).toBeCloseTo(75.96, 2);
  });

  it("centers within the visible viewport and respects safe-area insets", () => {
    const rect = getFeedImageLightboxTargetRect({
      viewportLeft: 12,
      viewportWidth: 390,
      viewportTop: 18,
      viewportHeight: 760,
      contentWidth: 320,
      contentHeight: 200,
      insetTop: 47,
      insetRight: 0,
      insetBottom: 34,
      insetLeft: 0,
      padding: 16,
    });

    expect(rect.width).toBeCloseTo(358, 2);
    expect(rect.height).toBeCloseTo(223.75, 2);
    expect(rect.left).toBeCloseTo(28, 2);
    expect(rect.top).toBeCloseTo(292.625, 2);
  });
});

describe("getFeedImageLightboxViewportRect", () => {
  it("uses the visual viewport when present on mobile browsers", () => {
    expect(
      getFeedImageLightboxViewportRect({
        layoutViewportWidth: 390,
        layoutViewportHeight: 844,
        visualViewport: {
          width: 390,
          height: 760,
          offsetLeft: 12,
          offsetTop: 18,
        },
      })
    ).toEqual({
      left: 12,
      top: 18,
      width: 390,
      height: 760,
    });
  });

  it("falls back to the layout viewport when visualViewport is unavailable", () => {
    expect(
      getFeedImageLightboxViewportRect({
        layoutViewportWidth: 1200,
        layoutViewportHeight: 900,
      })
    ).toEqual({
      left: 0,
      top: 0,
      width: 1200,
      height: 900,
    });
  });
});

describe("getFeedImageLightboxMotionStyle", () => {
  it("uses a top-left transform origin and a uniform scale so the image does not stretch", () => {
    expect(
      getFeedImageLightboxMotionStyle({
        originRect: {
          top: 120,
          left: 24,
          width: 300,
          height: 200,
        },
        targetRect: {
          top: 60,
          left: 150,
          width: 900,
          height: 600,
        },
        isVisible: true,
      })
    ).toEqual(
      expect.objectContaining({
        transformOrigin: "top left",
        transform: "translate3d(126px, -60px, 0) scale(3)",
      })
    );
  });

  it("keeps the image at its measured feed position before the expansion starts", () => {
    expect(
      getFeedImageLightboxMotionStyle({
        originRect: {
          top: 120,
          left: 24,
          width: 300,
          height: 200,
        },
        targetRect: {
          top: 60,
          left: 150,
          width: 900,
          height: 600,
        },
        isVisible: false,
      }).transform
    ).toBe("translate3d(0, 0, 0) scale(1)");
  });
});
