"use client";

import { useState, useEffect } from "react";
import { PostCard } from "@/components/feed/post-card";
import { markMentionsSeen } from "@/lib/actions/mentions";
import { cn } from "@/lib/utils/cn";
import type { PostWithAuthor } from "@/lib/types";

interface MentionsListProps {
  userId: string;
  currentUserId?: string;
}

export function MentionsList({ userId, currentUserId }: MentionsListProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [unreadPostIds, setUnreadPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mentions");
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts ?? []);
          setUnreadPostIds(new Set(data.unreadPostIds ?? []));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }

      // Mark mentions as seen
      markMentionsSeen();
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Noch keine Erwähnungen heute
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className={cn(
            "rounded-lg",
            unreadPostIds.has(post.id) && "ring-2 ring-primary"
          )}
        >
          <PostCard post={post} currentUserId={currentUserId} />
        </div>
      ))}
    </div>
  );
}
