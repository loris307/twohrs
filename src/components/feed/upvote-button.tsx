"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { ArrowBigUp } from "lucide-react";
import { toggleVote } from "@/lib/actions/votes";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

interface UpvoteButtonProps {
  postId: string;
  initialCount: number;
  initialVoted: boolean;
}

export function UpvoteButton({
  postId,
  initialCount,
  initialVoted,
}: UpvoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const doUpvote = useCallback(() => {
    if (voted) return; // Already upvoted — don't toggle off
    setVoted(true);
    setCount((prev) => prev + 1);

    startTransition(async () => {
      const result = await toggleVote(postId);
      if (!result.success) {
        setVoted(false);
        setCount((prev) => prev - 1);
        toast.error(result.error);
      }
    });
  }, [voted, postId]);

  // Listen for double-tap events from PostCardLink
  useEffect(() => {
    function handleDoubleTap(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === postId) {
        doUpvote();
      }
    }
    document.addEventListener("post-double-tap", handleDoubleTap);
    return () => document.removeEventListener("post-double-tap", handleDoubleTap);
  }, [postId, doUpvote]);

  function handleClick() {
    // Optimistic update
    const newVoted = !voted;
    setVoted(newVoted);
    setCount((prev) => prev + (newVoted ? 1 : -1));

    // Trigger animation overlay when upvoting
    if (newVoted) {
      document.dispatchEvent(new CustomEvent("post-upvote-animation", { detail: postId }));
    }

    startTransition(async () => {
      const result = await toggleVote(postId);
      if (!result.success) {
        // Rollback
        setVoted(!newVoted);
        setCount((prev) => prev + (newVoted ? -1 : 1));
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        voted
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <ArrowBigUp
        className={cn("h-5 w-5", voted && "fill-primary")}
      />
      <span className="tabular-nums">{formatNumber(count)}</span>
    </button>
  );
}
