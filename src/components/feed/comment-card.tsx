"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowBigUp, Trash2 } from "lucide-react";
import { toggleCommentVote, deleteComment } from "@/lib/actions/comments";
import { formatRelativeTime, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import type { CommentWithAuthor } from "@/lib/types";

interface CommentCardProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onDeleted: () => void;
}

export function CommentCard({ comment, currentUserId, onDeleted }: CommentCardProps) {
  const profile = comment.profiles;
  const [voted, setVoted] = useState(comment.has_voted);
  const [count, setCount] = useState(comment.upvote_count);
  const [isPending, startTransition] = useTransition();
  const isOwn = currentUserId === comment.user_id;

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
    <div className="flex gap-2 py-2">
      {/* Avatar */}
      <Link
        href={`/profile/${profile.username}`}
        className="shrink-0"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm">
          <Link
            href={`/profile/${profile.username}`}
            className="font-medium hover:underline"
          >
            {profile.username}
          </Link>{" "}
          {comment.text}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(comment.created_at)}</span>
          {count > 0 && (
            <span className="font-medium">
              {formatNumber(count)} {count === 1 ? "Like" : "Likes"}
            </span>
          )}
          {isOwn && (
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
