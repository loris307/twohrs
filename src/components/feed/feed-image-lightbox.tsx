"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS,
  type FeedImageLightboxRect,
  getFeedImageLightboxClosedPresentation,
  getFeedImageLightboxContentDimensions,
  getFeedImageLightboxMotionStyle,
  getFeedImageLightboxOriginRect,
  getFeedImageLightboxPresentation,
  getFeedImageLightboxTargetRect,
  getFeedImageLightboxViewportRect,
} from "@/lib/utils/feed-image-lightbox";
import {
  createFeedImageLightboxSafeAreaInsetsReader,
  type FeedImageLightboxSafeAreaInsets,
} from "@/lib/utils/feed-image-lightbox-safe-area";
import { dismissFeedImageLightbox } from "@/lib/utils/feed-image-lightbox-dismiss";
import {
  FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT,
  isFeedImageLightboxPinchZoomActive,
} from "@/lib/utils/feed-image-lightbox-zoom";

interface FeedImageLightboxProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  unoptimized?: boolean;
  fullWidth?: boolean;
}

export function FeedImageLightbox({
  src,
  alt,
  width,
  height,
  className,
  style,
  unoptimized,
  fullWidth = true,
}: FeedImageLightboxProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportMetaRef = useRef<HTMLMetaElement | null>(null);
  const viewportMetaContentRef = useRef<string | null>(null);
  const safeAreaInsetsReaderRef = useRef<ReturnType<
    typeof createFeedImageLightboxSafeAreaInsetsReader
  > | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [originRect, setOriginRect] = useState<FeedImageLightboxRect | null>(null);
  const [targetRect, setTargetRect] = useState<FeedImageLightboxRect | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const clearPendingClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearPendingFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const getOverlayPadding = useCallback(() => {
    if (typeof window === "undefined") return 16;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    if (viewportWidth >= 768) return 40;
    if (viewportWidth >= 640) return 24;
    return 16;
  }, []);

  const getViewportRect = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };
    }

    return getFeedImageLightboxViewportRect({
      layoutViewportWidth: document.documentElement.clientWidth,
      layoutViewportHeight: document.documentElement.clientHeight,
      visualViewport: window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            offsetLeft: window.visualViewport.offsetLeft,
            offsetTop: window.visualViewport.offsetTop,
          }
        : undefined,
    });
  }, []);

  const readSafeAreaInsetsFromDom = useCallback((): FeedImageLightboxSafeAreaInsets => {
    if (typeof document === "undefined") {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
    }

    const probe = document.createElement("div");
    probe.style.cssText = [
      "position: fixed",
      "visibility: hidden",
      "pointer-events: none",
      "inset: 0",
      "padding-top: env(safe-area-inset-top)",
      "padding-right: env(safe-area-inset-right)",
      "padding-bottom: env(safe-area-inset-bottom)",
      "padding-left: env(safe-area-inset-left)",
    ].join(";");
    document.body.appendChild(probe);

    const styles = window.getComputedStyle(probe);
    const insets = {
      top: Number.parseFloat(styles.paddingTop) || 0,
      right: Number.parseFloat(styles.paddingRight) || 0,
      bottom: Number.parseFloat(styles.paddingBottom) || 0,
      left: Number.parseFloat(styles.paddingLeft) || 0,
    };

    probe.remove();
    return insets;
  }, []);

  const getSafeAreaInsets = useCallback(() => {
    if (!safeAreaInsetsReaderRef.current) {
      safeAreaInsetsReaderRef.current = createFeedImageLightboxSafeAreaInsetsReader(
        readSafeAreaInsetsFromDom
      );
    }

    return safeAreaInsetsReaderRef.current.read();
  }, [readSafeAreaInsetsFromDom]);

  const contentDimensions = getFeedImageLightboxContentDimensions({
    fallbackWidth: width,
    fallbackHeight: height,
    naturalWidth: naturalSize?.width,
    naturalHeight: naturalSize?.height,
  });

  const measureRects = useCallback(() => {
    if (typeof window === "undefined" || !buttonRef.current) return null;

    const viewportRect = getViewportRect();
    const safeAreaInsets = getSafeAreaInsets();
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const renderedImageRect = imageRef.current?.getBoundingClientRect();
    const measuredOrigin = getFeedImageLightboxOriginRect({
      viewportRect,
      triggerRect,
      imageRect: renderedImageRect
        ? {
            top: renderedImageRect.top,
            left: renderedImageRect.left,
            width: renderedImageRect.width,
            height: renderedImageRect.height,
          }
        : undefined,
    });

    const measuredTarget = getFeedImageLightboxTargetRect({
      viewportLeft: viewportRect.left,
      viewportWidth: viewportRect.width,
      viewportTop: viewportRect.top,
      viewportHeight: viewportRect.height,
      contentWidth: contentDimensions.width,
      contentHeight: contentDimensions.height,
      insetTop: safeAreaInsets.top,
      insetRight: safeAreaInsets.right,
      insetBottom: safeAreaInsets.bottom,
      insetLeft: safeAreaInsets.left,
      padding: getOverlayPadding(),
    });

    return {
      origin: measuredOrigin,
      target: measuredTarget,
    };
  }, [contentDimensions.height, contentDimensions.width, getOverlayPadding, getSafeAreaInsets, getViewportRect]);

  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    imageRef.current = img;

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize((current) => {
        if (
          current?.width === img.naturalWidth &&
          current?.height === img.naturalHeight
        ) {
          return current;
        }

        return {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      });
    }
  }, []);

  const closeLightbox = useCallback(() => {
    clearPendingFrame();
    clearPendingClose();
    setIsVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setOriginRect(null);
      setTargetRect(null);
      closeTimerRef.current = null;
    }, FEED_IMAGE_LIGHTBOX_CLOSE_DURATION_MS);
  }, [clearPendingClose, clearPendingFrame]);

  const openLightbox = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isOpen) {
      event.preventDefault();
      return;
    }

    clearPendingFrame();
    clearPendingClose();
    safeAreaInsetsReaderRef.current?.invalidate();
    const measuredRects = measureRects();
    if (!measuredRects) return;
    setOriginRect(measuredRects.origin);
    setTargetRect(measuredRects.target);
    setIsOpen(true);
    animationFrameRef.current = requestAnimationFrame(() => {
      setIsVisible(true);
      animationFrameRef.current = null;
    });
  }, [clearPendingClose, clearPendingFrame, isOpen, measureRects]);

  useEffect(() => {
    return () => {
      clearPendingFrame();
      clearPendingClose();
    };
  }, [clearPendingClose, clearPendingFrame]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewportMetaRef.current = document.querySelector('meta[name="viewport"]');
    viewportMetaContentRef.current = viewportMetaRef.current?.getAttribute("content") ?? null;
    viewportMetaRef.current?.setAttribute("content", FEED_IMAGE_LIGHTBOX_ZOOM_VIEWPORT_CONTENT);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (viewportMetaRef.current) {
        if (viewportMetaContentRef.current) {
          viewportMetaRef.current.setAttribute("content", viewportMetaContentRef.current);
        } else {
          viewportMetaRef.current.removeAttribute("content");
        }
      }
    };
  }, [closeLightbox, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleResize() {
      if (isFeedImageLightboxPinchZoomActive(window.visualViewport?.scale)) {
        return;
      }

      safeAreaInsetsReaderRef.current?.invalidate();
      const measuredRects = measureRects();
      if (!measuredRects) return;
      setTargetRect(measuredRects.target);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, [isOpen, measureRects]);

  const presentation = getFeedImageLightboxPresentation(isVisible);
  const closedPresentation = getFeedImageLightboxClosedPresentation(fullWidth);
  const isExpanded = isOpen && !!originRect && !!targetRect;
  const viewportRect = isExpanded ? getViewportRect() : null;
  const fixedImageStyle = isExpanded && originRect && targetRect
    ? {
        position: "fixed" as const,
        top: originRect.top,
        left: originRect.left,
        width: originRect.width,
        height: originRect.height,
        ...getFeedImageLightboxMotionStyle({
          originRect,
          targetRect,
          isVisible,
        }),
        transition: "transform 200ms ease-out",
        zIndex: 81,
      }
    : undefined;
  const placeholderStyle = isExpanded && originRect
    ? {
        height: originRect.height,
      }
    : undefined;

  return (
    <div className="relative" style={placeholderStyle}>
      {isExpanded ? (
        <>
          <div
            className={cn(
              "fixed z-[80] flex items-center justify-center",
              presentation.overlayClassName
            )}
            style={viewportRect
              ? {
                  top: viewportRect.top,
                  left: viewportRect.left,
                  width: viewportRect.width,
                  height: viewportRect.height,
                }
              : undefined}
            onClick={(event) => dismissFeedImageLightbox(event, closeLightbox)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/25 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/25 to-transparent" />
          </div>

          <button
            type="button"
            onClick={(event) => dismissFeedImageLightbox(event, closeLightbox)}
            aria-label="bild schließen"
            className="fixed left-4 top-4 z-[82] inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
              left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
            }}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">schließen</span>
          </button>
        </>
      ) : null}

      <button
        type="button"
        ref={buttonRef}
        onClick={openLightbox}
        data-post-card-interactive
        aria-label={isExpanded ? "bild im vollbild" : "bild im vollbild öffnen"}
        aria-expanded={isExpanded}
        className={cn(
          "block overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isExpanded
            ? "cursor-default"
            : closedPresentation.triggerClassName
        )}
        style={fixedImageStyle}
      >
        <Image
          src={src}
          alt={alt}
          width={contentDimensions.width}
          height={contentDimensions.height}
          onLoad={handleImageLoad}
          className={cn(
            isExpanded
              ? "h-full w-full rounded-xl border border-border/60 bg-card/20 object-contain shadow-2xl"
              : closedPresentation.imageClassName,
            !isExpanded && className
          )}
          style={isExpanded ? undefined : style}
          unoptimized={unoptimized}
        />
      </button>
    </div>
  );
}
