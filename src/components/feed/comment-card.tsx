"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowBigUp, Trash2 } from "lucide-react";
import { toggleCommentVote, deleteComment } from "@/lib/actions/comments";
import { formatRelativeTime, formatNumber } from "@/lib/utils/format";
import { renderTextWithMentions } from "@/lib/utils/render-mentions";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import type { CommentWithAuthor } from "@/lib/types";

interface CommentCardProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onDeleted: () => void;
  onReply?: (commentId: string, username: string) => void;
  isReply?: boolean;
  isReplyTarget?: boolean;
  isAdmin?: boolean;
}

export function CommentCard({
  comment,
  currentUserId,
  onDeleted,
  onReply,
  isReply,
  isReplyTarget,
  isAdmin,
}: CommentCardProps) {
  const profile = comment.profiles;
  const [voted, setVoted] = useState(comment.has_voted);
  const [count, setCount] = useState(comment.upvote_count);
  const [isPending, startTransition] = useTransition();
  const isOwn = currentUserId === comment.user_id;

  const avatarSize = isReply ? 20 : 24;

  function handleVote() {
    const newVoted = !voted;
    setVoted(newVoted);
    setCount((prev) => prev + (newVoted ? 1 : -1));

    startTransition(async () => {
      const result = await toggleCommentVote(comment.id);
      if (!result.success) {
        setVoted(!newVoted);
        setCount((prev) => prev + (newVoted ? -1 : 1));
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result.success) {
        onDeleted();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex gap-2 py-2",
        isReplyTarget && "rounded-md bg-primary/5"
      )}
    >
      {/* Avatar */}
      <Link
        href={`/profile/${profile.username}`}
        className="shrink-0"
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted font-medium",
            isReply
              ? "h-5 w-5 text-[8px]"
              : "h-6 w-6 text-[10px]"
          )}
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={avatarSize}
              height={avatarSize}
              className={cn(
                "rounded-full object-cover",
                isReply ? "h-5 w-5" : "h-6 w-6"
              )}
            />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("break-words", isReply ? "text-xs" : "text-sm")}>
          <Link
            href={`/profile/${profile.username}`}
            className="font-medium text-primary hover:underline"
          >
            {profile.username}
          </Link>{" "}
          {renderTextWithMentions(comment.text)}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(comment.created_at)}</span>
          {count > 0 && (
            <span className="font-medium">
              {formatNumber(count)} {count === 1 ? "Like" : "Likes"}
            </span>
          )}
          {onReply && (
            <button
              onClick={() => onReply(comment.id, profile.username)}
              className="font-medium hover:text-foreground"
            >
              Antworten
            </button>
          )}
          {(isOwn || isAdmin) && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Upvote */}
      <button
        onClick={handleVote}
        disabled={isPending}
        className="shrink-0 self-start pt-0.5"
      >
        <ArrowBigUp
          className={cn(
            "h-4 w-4 transition-colors",
            voted
              ? "fill-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        />
      </button>
    </div>
  );
}
