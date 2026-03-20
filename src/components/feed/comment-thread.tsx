"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { CommentCard } from "./comment-card";
import { COMMENT_REPLIES_PAGE_SIZE } from "@/lib/constants";
import { getVisualCommentDepth, mergeUniqueCommentsById } from "@/lib/comments/threading";
import type { CommentListItem } from "@/lib/types";

interface CommentThreadProps {
  comment: CommentListItem;
  currentUserId?: string;
  isAdmin?: boolean;
  visualDepth?: number;
  maxVisualDepth: number;
  onReply: (commentId: string, username: string) => void;
  onDeleted: (commentId: string) => void;
  replyTargetId?: string | null;
  replyTargetVersion?: number;
}

export function CommentThread({
  comment,
  currentUserId,
  isAdmin,
  visualDepth = 0,
  maxVisualDepth,
  onReply,
  onDeleted,
  replyTargetId,
  replyTargetVersion = 0,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentListItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastHandledVersion = useRef(0);

  const loadReplies = useCallback(async (offset = 0) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/comments/${comment.id}/replies?offset=${offset}&limit=${COMMENT_REPLIES_PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setReplies(data.replies);
        } else {
          setReplies((prev) => mergeUniqueCommentsById(prev, data.replies));
        }
        setNextOffset(data.nextOffset);
      }
    } finally {
      setIsLoading(false);
    }
  }, [comment.id]);

  // Auto-expand and reload when this comment is the reply target
  useEffect(() => {
    if (
      replyTargetId === comment.id &&
      replyTargetVersion > 0 &&
      replyTargetVersion !== lastHandledVersion.current
    ) {
      lastHandledVersion.current = replyTargetVersion;
      setIsExpanded(true);
      loadReplies(0);
    }
  }, [replyTargetId, replyTargetVersion, comment.id, loadReplies]);

  async function handleExpand() {
    if (!isExpanded) {
      await loadReplies(0);
    }
    setIsExpanded(true);
  }

  const clampedDepth = getVisualCommentDepth(visualDepth, maxVisualDepth);
  const parentClamped = visualDepth > 0 ? getVisualCommentDepth(visualDepth - 1, maxVisualDepth) : -1;
  const shouldIndent = clampedDepth > parentClamped;

  const hasReplies = comment.reply_count > 0 || replies.length > 0;

  return (
    <div
      className={visualDepth > 0 && shouldIndent ? "ml-2" : undefined}
      role="article"
    >
      <CommentCard
        comment={comment}
        currentUserId={currentUserId}
        onDeleted={(id) => onDeleted(id)}
        onReply={onReply}
        isReply={visualDepth > 0}
        isAdmin={isAdmin}
      />

      {/* Expand/collapse toggle + thread */}
      {hasReplies && !isExpanded && (
        <button
          onClick={handleExpand}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border/80">
            <Play className="h-2 w-2 fill-current" />
          </span>
          <span>
            {isLoading
              ? "laden..."
              : `${comment.reply_count} ${comment.reply_count === 1 ? "antwort" : "antworten"} anzeigen`}
          </span>
        </button>
      )}

      {hasReplies && isExpanded && (
        <div className="relative">
          {/* Triangle-in-circle collapse button — connects to thread line */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="relative z-10 flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border/80 bg-background">
              <Play className="h-2 w-2 rotate-90 fill-current" />
            </span>
          </button>

          {/* Clickable vertical thread line — collapse on click */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="group absolute left-[8px] top-[22px] bottom-0 w-4 -translate-x-1/2 cursor-pointer"
            aria-label="Antworten einklappen"
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-full bg-border/50 transition-colors group-hover:bg-primary" />
          </button>

          {/* Replies container */}
          <div className="pl-3">
            {replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                visualDepth={visualDepth + 1}
                maxVisualDepth={maxVisualDepth}
                onReply={onReply}
                onDeleted={(id) => {
                  loadReplies(0);
                  onDeleted(id);
                }}
                replyTargetId={replyTargetId}
                replyTargetVersion={replyTargetVersion}
              />
            ))}

            {nextOffset !== null && (
              <button
                onClick={() => loadReplies(nextOffset)}
                disabled={isLoading}
                className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border/80">
                  <Play className="h-2 w-2 fill-current" />
                </span>
                <span>{isLoading ? "laden..." : "weitere antworten laden"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { CommentThreadProps };
