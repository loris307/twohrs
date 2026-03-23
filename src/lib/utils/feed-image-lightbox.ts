import { cn } from "@/lib/utils/cn";

export const FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS = 200;
const FEED_IMAGE_LIGHTBOX_MAX_HEIGHT_RATIO = 0.82;

interface FeedImageLightboxTargetRectOptions {
  viewportLeft: number;
  viewportWidth: number;
  viewportTop: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  insetTop: number;
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
  padding: number;
}

export type FeedImageLightboxRect = {
  width: number;
  height: number;
  left: number;
  top: number;
};

interface FeedImageLightboxViewportRectOptions {
  layoutViewportWidth: number;
  layoutViewportHeight: number;
  visualViewport?: {
    width: number;
    height: number;
    offsetLeft: number;
    offsetTop: number;
  };
}

interface FeedImageLightboxMotionStyleOptions {
  originRect: FeedImageLightboxRect;
  targetRect: FeedImageLightboxRect;
  isVisible: boolean;
}

interface FeedImageLightboxContentDimensionsOptions {
  fallbackWidth: number;
  fallbackHeight: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

interface FeedImageLightboxOriginRectOptions {
  viewportRect: FeedImageLightboxRect;
  triggerRect: Pick<FeedImageLightboxRect, "left" | "top" | "width" | "height">;
  imageRect?: Pick<FeedImageLightboxRect, "left" | "top" | "width" | "height">;
}

export function getFeedImageLightboxClosedPresentation(fullWidth: boolean) {
  if (fullWidth) {
    return {
      triggerClassName: "w-full cursor-zoom-in",
      imageClassName: "w-full object-contain",
    };
  }

  return {
    triggerClassName: "inline-block cursor-zoom-in",
    imageClassName: "h-auto max-w-full object-contain",
  };
}

export function getFeedImageLightboxPresentation(isVisible: boolean) {
  return {
    overlayClassName: cn(
      "transition-all duration-200 ease-out",
      isVisible
        ? "bg-background/55 opacity-100 backdrop-blur-sm"
        : "bg-background/0 opacity-0 backdrop-blur-none"
    ),
  };
}

export function getFeedImageLightboxTargetRect({
  viewportLeft,
  viewportWidth,
  viewportTop,
  viewportHeight,
  contentWidth,
  contentHeight,
  insetTop,
  insetRight,
  insetBottom,
  insetLeft,
  padding,
}: FeedImageLightboxTargetRectOptions): FeedImageLightboxRect {
  const usableWidth = Math.max(
    viewportWidth - insetLeft - insetRight - padding * 2,
    1
  );
  const usableHeight = Math.max(
    viewportHeight - insetTop - insetBottom - padding * 2,
    1
  );
  const maxContentHeight = Math.max(
    Math.min(usableHeight, viewportHeight * FEED_IMAGE_LIGHTBOX_MAX_HEIGHT_RATIO),
    1
  );

  const scale = Math.min(usableWidth / contentWidth, maxContentHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;

  return {
    width,
    height,
    left: viewportLeft + insetLeft + padding + (usableWidth - width) / 2,
    top: viewportTop + insetTop + padding + (usableHeight - height) / 2,
  };
}

export function getFeedImageLightboxContentDimensions({
  fallbackWidth,
  fallbackHeight,
  naturalWidth,
  naturalHeight,
}: FeedImageLightboxContentDimensionsOptions): Pick<FeedImageLightboxRect, "width" | "height"> {
  if (
    typeof naturalWidth === "number" &&
    naturalWidth > 0 &&
    typeof naturalHeight === "number" &&
    naturalHeight > 0
  ) {
    return {
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  return {
    width: fallbackWidth,
    height: fallbackHeight,
  };
}

export function getFeedImageLightboxOriginRect({
  viewportRect,
  triggerRect,
  imageRect,
}: FeedImageLightboxOriginRectOptions): FeedImageLightboxRect {
  const rect = imageRect ?? triggerRect;

  return {
    top: rect.top + viewportRect.top,
    left: rect.left + viewportRect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function getFeedImageLightboxViewportRect({
  layoutViewportWidth,
  layoutViewportHeight,
  visualViewport,
}: FeedImageLightboxViewportRectOptions): FeedImageLightboxRect {
  if (
    visualViewport &&
    visualViewport.width > 0 &&
    visualViewport.height > 0
  ) {
    return {
      left: visualViewport.offsetLeft,
      top: visualViewport.offsetTop,
      width: visualViewport.width,
      height: visualViewport.height,
    };
  }

  return {
    left: 0,
    top: 0,
    width: layoutViewportWidth,
    height: layoutViewportHeight,
  };
}

export function getFeedImageLightboxMotionStyle({
  originRect,
  targetRect,
  isVisible,
}: FeedImageLightboxMotionStyleOptions) {
  const scale = targetRect.width / originRect.width;

  return {
    transformOrigin: "top left" as const,
    transform: isVisible
      ? `translate3d(${targetRect.left - originRect.left}px, ${targetRect.top - originRect.top}px, 0) scale(${scale})`
      : "translate3d(0, 0, 0) scale(1)",
  };
}
