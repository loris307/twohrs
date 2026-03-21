import { describe, expect, it } from "vitest";
import {
  FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT,
  isFeedImageLightboxPinchZoomActive,
} from "./feed-image-lightbox-zoom";

describe("FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT", () => {
  it("allows browser pinch zoom while the lightbox is open", () => {
    expect(FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT).toBe(
      "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover"
    );
  });
});

describe("isFeedImageLightboxPinchZoomActive", () => {
  it("returns true only when the visual viewport scale exceeds the normal resting scale", () => {
    expect(isFeedImageLightboxPinchZoomActive(undefined)).toBe(false);
    expect(isFeedImageLightboxPinchZoomActive(1)).toBe(false);
    expect(isFeedImageLightboxPinchZoomActive(1.005)).toBe(false);
    expect(isFeedImageLightboxPinchZoomActive(1.02)).toBe(true);
  });
});
