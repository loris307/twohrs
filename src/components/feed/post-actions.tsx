"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, ArrowBigUp, ImageIcon } from "lucide-react";
import { UpvoteButton } from "./upvote-button";
import { ShareButton } from "./share-button";
import { CommentThread } from "./comment-thread";
import { CommentInput } from "./comment-input";
import { formatNumber } from "@/lib/utils/format";
import { renderTextWithMentions } from "@/lib/utils/render-mentions";
import { cn } from "@/lib/utils/cn";
import { COMMENT_PREVIEW_TOP_LEVEL_LIMIT, COMMENT_MAX_VISUAL_DEPTH_MOBILE } from "@/lib/constants";
import type { CommentListItem } from "@/lib/types";

interface PostActionsProps {
  postId: string;
  initialUpvoteCount: number;
  initialVoted: boolean;
  initialCommentCount: number;
  caption: string | null;
  isAdmin?: boolean;
  initialComments?: CommentListItem[];
  currentUserId?: string;
}

export function PostActions({
  postId,
  initialUpvoteCount,
  initialVoted,
  initialCommentCount,
  caption,
  isAdmin,
  initialComments,
  currentUserId,
}: PostActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<CommentListItem[]>(initialComments ?? []);
  const [count, setCount] = useState(initialCommentCount);
  const [totalCount, setTotalCount] = useState(initialCommentCount);
  const [hasLoaded, setHasLoaded] = useState((initialComments ?? []).length > 0 || initialCommentCount === 0);
  const [isPending, startTransition] = useTransition();
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyTargetVersion, setReplyTargetVersion] = useState(0);

  const fetchComments = useCallback(() => {
    startTransition(async () => {
      const res = await fetch(
        `/api/comments?postId=${postId}&offset=0&limit=${COMMENT_PREVIEW_TOP_LEVEL_LIMIT}`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setTotalCount(data.totalCount);
        setCount(data.totalCount);
        setHasLoaded(true);
      }
    });
  }, [postId]);

  function handleToggle() {
    if (!isOpen) {
      fetchComments();
    }
    setIsOpen((prev) => !prev);
  }

  function handleCommentCreated() {
    if (replyingTo) {
      setReplyTargetId(replyingTo.commentId);
      setReplyTargetVersion((v) => v + 1);
    }
    fetchComments();
    setCount((prev) => prev + 1);
  }

  function handleCommentDeleted() {
    fetchComments();
    setCount((prev) => Math.max(0, prev - 1));
  }

  function handleReply(commentId: string, username: string) {
    setReplyingTo({ commentId, username });
    setIsOpen(true);
  }

  function handleCancelReply() {
    setReplyingTo(null);
  }

  return (
    <div className="px-4 py-3">
      {/* Action buttons row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <UpvoteButton
            postId={postId}
            initialCount={initialUpvoteCount}
            initialVoted={initialVoted}
          />
          <button
            onClick={handleToggle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-label={isOpen ? "Kommentarfeld schließen" : "Kommentieren"}
            aria-expanded={isOpen}
          >
            <MessageCircle className={cn("h-4 w-4", isOpen && "fill-primary")} />
            {count > 0 && <span className="tabular-nums">{formatNumber(count)}</span>}
          </button>
        </div>
        <ShareButton postId={postId} caption={caption} />
      </div>

      {/* Compact comment preview — always visible when comments exist and panel is closed */}
      {!isOpen && comments.length > 0 && (
        <div className="mt-2 space-y-1">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">@{comment.profiles.username}</span>{" "}
                {comment.image_path && !comment.text && (
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>bild</span>
                  </span>
                )}
                {comment.text && (
                  <span className="text-muted-foreground whitespace-pre-wrap break-words">
                    {comment.image_path && (
                      <ImageIcon className="mr-0.5 inline h-3 w-3 align-text-bottom" />
                    )}
                    {renderTextWithMentions(comment.text)}
                  </span>
                )}
              </div>
              {comment.upvote_count > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-xs text-primary">
                  <ArrowBigUp className="h-3.5 w-3.5 fill-primary" />
                  {formatNumber(comment.upvote_count)}
                </span>
              )}
            </div>
          ))}

          {totalCount > comments.length && (
            <Link
              href={`/post/${postId}`}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Alle {totalCount} Kommentare ansehen
            </Link>
          )}
        </div>
      )}

      {/* Full comment panel — when button is toggled open */}
      {isOpen && (
        <div className="mt-3 border-t border-border pt-3">
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
                maxVisualDepth={COMMENT_MAX_VISUAL_DEPTH_MOBILE}
                onReply={handleReply}
                onDeleted={handleCommentDeleted}
                replyTargetId={replyTargetId}
                replyTargetVersion={replyTargetVersion}
              />
            ))}

            {totalCount > comments.length && (
              <Link
                href={`/post/${postId}`}
                className="block py-2 text-center text-sm font-medium text-primary hover:text-primary/80"
              >
                Alle {totalCount} Kommentare ansehen
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
