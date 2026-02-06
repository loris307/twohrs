"use client";

import { useState, useTransition } from "react";
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

  function handleClick() {
    // Optimistic update
    const newVoted = !voted;
    setVoted(newVoted);
    setCount((prev) => prev + (newVoted ? 1 : -1));

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
      disabled={isPending}
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
