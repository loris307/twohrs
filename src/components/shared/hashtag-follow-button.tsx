"use client";

import { useState, useTransition } from "react";
import { Hash } from "lucide-react";
import { followHashtag, unfollowHashtag } from "@/lib/actions/hashtags";
import { toast } from "sonner";

interface HashtagFollowButtonProps {
  hashtag: string;
  initialFollowed: boolean;
  size?: "sm" | "md";
}

export function HashtagFollowButton({
  hashtag,
  initialFollowed,
  size = "sm",
}: HashtagFollowButtonProps) {
  const [isFollowed, setIsFollowed] = useState(initialFollowed);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isFollowed;
    setIsFollowed(newState);

    startTransition(async () => {
      const result = newState
        ? await followHashtag(hashtag)
        : await unfollowHashtag(hashtag);
      if (!result.success) {
        setIsFollowed(!newState);
        toast.error(result.error);
      }
    });
  }

  const sizeClasses =
    size === "md"
      ? "px-4 py-1.5 text-sm"
      : "px-2.5 py-1 text-xs";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1 rounded-md font-medium transition-colors disabled:opacity-50 ${sizeClasses} ${
        isFollowed
          ? "bg-muted text-muted-foreground hover:bg-muted/80"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      <Hash className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {isFollowed ? "Entfolgen" : "Folgen"}
    </button>
  );
}
