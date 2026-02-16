"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { followUser } from "@/lib/actions/follows";
import { toast } from "sonner";

interface PostFollowButtonProps {
  userId: string;
}

export function PostFollowButton({ userId }: PostFollowButtonProps) {
  const [followed, setFollowed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (followed) return null;

  function handleFollow() {
    setFollowed(true);
    startTransition(async () => {
      const result = await followUser(userId);
      if (!result.success) {
        setFollowed(false);
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      <UserPlus className="h-3.5 w-3.5" />
      Folgen
    </button>
  );
}
