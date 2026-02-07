"use client";

import { useState, useTransition, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { CommentCard } from "./comment-card";
import { CommentInput } from "./comment-input";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CommentWithAuthor } from "@/lib/types";

interface CommentSectionProps {
  postId: string;
  initialCount: number;
}

export function CommentSection({
  postId,
  initialCount,
}: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [count, setCount] = useState(initialCount);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchComments = useCallback(() => {
    startTransition(async () => {
      const res = await fetch(`/api/comments?postId=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setCount(data.comments.length);
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
        setHasLoaded(true);
      }
    });
  }, [postId]);

  function handleToggle() {
    if (!isOpen && !hasLoaded) {
      fetchComments();
    }
    setIsOpen((prev) => !prev);
  }

  function handleCommentCreated() {
    fetchComments();
    setCount((prev) => prev + 1);
  }

  function handleCommentDeleted() {
    fetchComments();
    setCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isOpen
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <MessageCircle className={cn("h-4 w-4", isOpen && "fill-primary")} />
        {count > 0 && <span className="tabular-nums">{formatNumber(count)}</span>}
      </button>

      {/* Comments panel */}
      {isOpen && (
        <div className="mt-3 border-t border-border pt-3">
          <CommentInput
            postId={postId}
            onCommentCreated={handleCommentCreated}
          />

          <div className="mt-3 space-y-0.5">
            {isPending && !hasLoaded && (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Laden...
              </p>
            )}

            {hasLoaded && comments.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Noch keine Kommentare
              </p>
            )}

            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
