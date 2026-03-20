"use client";

import { useState, useCallback } from "react";
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
}

export function CommentThread({
  comment,
  currentUserId,
  isAdmin,
  visualDepth = 0,
  maxVisualDepth,
  onReply,
  onDeleted,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replies, setReplies] = useState<CommentListItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(false);

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

  async function handleExpand() {
    if (!isExpanded) {
      await loadReplies(0);
    }
    setIsExpanded((prev) => !prev);
  }

  const clampedDepth = getVisualCommentDepth(visualDepth, maxVisualDepth);
  const indentStyle = clampedDepth > 0
    ? { marginLeft: `${clampedDepth * 0.75}rem` }
    : undefined;

  const hasReplies = comment.reply_count > 0;

  return (
    <div style={indentStyle} role="article">
      {clampedDepth > 0 && (
        <div className="border-l border-border pl-3">
          <CommentCard
            comment={comment}
            currentUserId={currentUserId}
            onDeleted={(id) => onDeleted(id)}
            onReply={onReply}
            isReply={visualDepth > 0}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {clampedDepth === 0 && (
        <CommentCard
          comment={comment}
          currentUserId={currentUserId}
          onDeleted={(id) => onDeleted(id)}
          onReply={onReply}
          isAdmin={isAdmin}
        />
      )}

      {/* Expand/collapse button for replies */}
      {hasReplies && !isExpanded && (
        <div style={indentStyle ? { marginLeft: `${(clampedDepth + 1) * 0.75}rem` } : { marginLeft: "0.75rem" }}>
          <button
            onClick={handleExpand}
            disabled={isLoading}
            className="py-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            {isLoading ? "Laden..." : `${comment.reply_count} ${comment.reply_count === 1 ? "Antwort" : "Antworten"} anzeigen`}
          </button>
        </div>
      )}

      {hasReplies && isExpanded && (
        <div>
          <div style={indentStyle ? { marginLeft: `${(clampedDepth + 1) * 0.75}rem` } : { marginLeft: "0.75rem" }}>
            <button
              onClick={() => setIsExpanded(false)}
              className="py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Antworten einklappen
            </button>
          </div>

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
                // Reload this branch from offset 0 after delete
                loadReplies(0);
                onDeleted(id);
              }}
            />
          ))}

          {nextOffset !== null && (
            <div style={indentStyle ? { marginLeft: `${(clampedDepth + 1) * 0.75}rem` } : { marginLeft: "0.75rem" }}>
              <button
                onClick={() => loadReplies(nextOffset)}
                disabled={isLoading}
                className="py-1 text-xs font-medium text-primary hover:text-primary/80"
              >
                {isLoading ? "Laden..." : "Weitere Antworten laden"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export the handleReplyCreated pattern for parent components
export type { CommentThreadProps };
