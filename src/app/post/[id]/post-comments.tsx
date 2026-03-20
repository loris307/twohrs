"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { CommentThread } from "@/components/feed/comment-thread";
import { CommentInput } from "@/components/feed/comment-input";
import { mergeUniqueCommentsById } from "@/lib/comments/threading";
import { COMMENT_DETAIL_TOP_LEVEL_LIMIT, COMMENT_MAX_VISUAL_DEPTH_DESKTOP } from "@/lib/constants";
import type { CommentListItem } from "@/lib/types";

interface PostCommentsProps {
  postId: string;
  isAdmin?: boolean;
}

export function PostComments({ postId, isAdmin }: PostCommentsProps) {
  const [comments, setComments] = useState<CommentListItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [totalCount, setTotalCount] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyTargetVersion, setReplyTargetVersion] = useState(0);

  const loadTopLevelComments = useCallback((offset: number) => {
    startTransition(async () => {
      const res = await fetch(
        `/api/comments?postId=${postId}&offset=${offset}&limit=${COMMENT_DETAIL_TOP_LEVEL_LIMIT}`
      );
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setComments(data.comments);
        } else {
          setComments((prev) => mergeUniqueCommentsById(prev, data.comments));
        }
        setTotalCount(data.totalCount);
        setNextOffset(data.nextOffset);
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
        setHasLoaded(true);
      }
    });
  }, [postId]);

  useEffect(() => {
    loadTopLevelComments(0);
  }, [loadTopLevelComments]);

  function handleCommentCreated() {
    if (replyingTo) {
      setReplyTargetId(replyingTo.commentId);
      setReplyTargetVersion((v) => v + 1);
    }
    loadTopLevelComments(0);
  }

  function handleCommentDeleted() {
    loadTopLevelComments(0);
  }

  function handleReply(commentId: string, username: string) {
    setReplyingTo({ commentId, username });
  }

  function handleCancelReply() {
    setReplyingTo(null);
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium">
        Kommentare{totalCount > 0 && ` (${totalCount})`}
      </h2>

      <CommentInput
        postId={postId}
        onCommentCreated={handleCommentCreated}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
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
          <CommentThread
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            visualDepth={0}
            maxVisualDepth={COMMENT_MAX_VISUAL_DEPTH_DESKTOP}
            onReply={handleReply}
            onDeleted={handleCommentDeleted}
            replyTargetId={replyTargetId}
            replyTargetVersion={replyTargetVersion}
          />
        ))}

        {nextOffset !== null && (
          <button
            onClick={() => loadTopLevelComments(nextOffset)}
            disabled={isPending}
            className="w-full py-2 text-center text-sm font-medium text-primary hover:text-primary/80"
          >
            Weitere Kommentare laden
          </button>
        )}
      </div>
    </div>
  );
}
