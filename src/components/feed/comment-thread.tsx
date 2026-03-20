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

  // Only indent by 1 level relative to parent (not absolute depth).
  // The parent is already indented, so we just add 1 step each time,
  // but stop adding visual indent once we hit the cap.
  const clampedDepth = getVisualCommentDepth(visualDepth, maxVisualDepth);
  const shouldIndent = visualDepth > 0 && clampedDepth > getVisualCommentDepth(visualDepth - 1, maxVisualDepth);

  const hasReplies = comment.reply_count > 0;

  return (
    <div role="article">
      {visualDepth > 0 ? (
        <div
          className="border-l border-border pl-3"
          style={shouldIndent ? { marginLeft: "0.75rem" } : undefined}
        >
          <CommentCard
            comment={comment}
            currentUserId={currentUserId}
            onDeleted={(id) => onDeleted(id)}
            onReply={onReply}
            isReply
            isAdmin={isAdmin}
          />
        </div>
      ) : (
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
        <div className="ml-3 pl-3">
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
          <div className="ml-3 pl-3">
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
                loadReplies(0);
                onDeleted(id);
              }}
            />
          ))}

          {nextOffset !== null && (
            <div className="ml-3 pl-3">
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

export type { CommentThreadProps };
