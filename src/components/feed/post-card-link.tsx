"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowBigUp } from "lucide-react";
import type { ReactNode, MouseEvent } from "react";

interface PostCardLinkProps {
  postId: string;
  children: ReactNode;
}

export function PostCardLink({ postId, children }: PostCardLinkProps) {
  const router = useRouter();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHeart, setShowHeart] = useState(false);

  const triggerAnimation = useCallback(() => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 600);
  }, []);

  // Listen for upvote-button clicks to show the animation + cleanup timer
  useEffect(() => {
    function handleUpvoteAnimation(e: Event) {
      if ((e as CustomEvent).detail === postId) {
        triggerAnimation();
      }
    }
    document.addEventListener("post-upvote-animation", handleUpvoteAnimation);
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      document.removeEventListener("post-upvote-animation", handleUpvoteAnimation);
    };
  }, [postId, triggerAnimation]);

  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Don't interfere with interactive elements
    if (target.closest("a, button, input, textarea, [role='button']")) {
      return;
    }

    if (clickTimer.current) {
      // Second click within window → double-click → upvote
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      document.dispatchEvent(new CustomEvent("post-double-tap", { detail: postId }));
      triggerAnimation();
    } else {
      // First click → wait to see if a second one comes
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        document.dispatchEvent(new Event("navigation-start"));
        router.push(`/post/${postId}`);
      }, 250);
    }
  }

  return (
    <article
      onClick={handleClick}
      className="relative cursor-pointer rounded-lg border border-border bg-card transition-colors hover:border-muted-foreground/30"
    >
      {children}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <ArrowBigUp className="h-20 w-20 fill-primary text-primary animate-double-tap-heart drop-shadow-lg" />
        </div>
      )}
    </article>
  );
}
