export const FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";

export function isFeedImageLightboxPinchZoomActive(scale?: number | null) {
  return (scale ?? 1) > 1.01;
}
