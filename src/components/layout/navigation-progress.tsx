"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatingRef = useRef(false);

  const startProgress = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setIsNavigating(true);
    setProgress(0);

    let current = 0;
    intervalRef.current = setInterval(() => {
      // Fast at first, then slows down — never reaches 100
      const increment = current < 30 ? 12 : current < 60 ? 6 : current < 80 ? 2 : 0.5;
      current = Math.min(current + increment, 95);
      setProgress(current);
    }, 150);
  }, []);

  const completeProgress = useCallback(() => {
    if (!navigatingRef.current) return;
    navigatingRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgress(100);
    setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 250);
  }, []);

  // Complete progress when the route changes
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams, completeProgress]);

  // Intercept clicks on internal links to start the bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, hash-only, mailto, tel
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;

      // Skip modifier keys (new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip target=_blank
      if (anchor.target === "_blank") return;

      // Skip if we're already on this exact path
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname && url.search === window.location.search) return;

      startProgress();
    };

    // Listen for programmatic navigations (router.push) via custom event
    const handleProgrammaticNav = () => startProgress();

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("navigation-start", handleProgrammaticNav);
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("navigation-start", handleProgrammaticNav);
    };
  }, [pathname, startProgress]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-[100] h-[2px]">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
