"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { followUser, unfollowUser } from "@/lib/actions/follows";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
}

export function FollowButton({ userId, initialFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const newState = !isFollowing;
    setIsFollowing(newState);

    startTransition(async () => {
      const result = newState
        ? await followUser(userId)
        : await unfollowUser(userId);

      if (!result.success) {
        setIsFollowing(!newState);
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        isFollowing
          ? "border border-border bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      } disabled:opacity-50`}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          Entfolgen
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Folgen
        </>
      )}
    </button>
  );
}
