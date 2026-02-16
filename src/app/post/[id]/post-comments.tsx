"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { CommentCard } from "@/components/feed/comment-card";
import { CommentInput } from "@/components/feed/comment-input";
import type { CommentWithReplies } from "@/lib/types";

interface PostCommentsProps {
  postId: string;
  isAdmin?: boolean;
}

export function PostComments({ postId, isAdmin }: PostCommentsProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  const fetchComments = useCallback(() => {
    startTransition(async () => {
      const res = await fetch(`/api/comments?postId=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
        setHasLoaded(true);
      }
    });
  }, [postId]);

  // Load comments immediately on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  function handleCommentCreated() {
    fetchComments();
  }

  function handleCommentDeleted() {
    fetchComments();
  }

  function handleReply(commentId: string, username: string) {
    setReplyingTo({ commentId, username });
  }

  function handleCancelReply() {
    setReplyingTo(null);
  }

  // Total count including replies
  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + c.replies.length,
    0
  );

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
          <div key={comment.id}>
            <CommentCard
              comment={comment}
              currentUserId={currentUserId}
              onDeleted={handleCommentDeleted}
              onReply={handleReply}
              isReplyTarget={replyingTo?.commentId === comment.id}
              isAdmin={isAdmin}
            />

            {comment.replies.length > 0 && (
              <div className="ml-8 border-l border-border pl-3">
                {comment.replies.map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onDeleted={handleCommentDeleted}
                    isReply
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
