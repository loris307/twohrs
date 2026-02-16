"use client";

import { useCallback } from "react";
import { useInfiniteFeed } from "@/lib/hooks/use-infinite-feed";
import { PostCard } from "@/components/feed/post-card";
import { FeedSkeleton } from "@/components/feed/feed-skeleton";
import type { PostWithAuthor } from "@/lib/types";

interface HashtagPostGridProps {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
  hashtag: string;
  isAdmin?: boolean;
}

export function HashtagPostGrid({
  initialPosts,
  initialCursor,
  hashtag,
  isAdmin,
}: HashtagPostGridProps) {
  const fetchMore = useCallback(
    async (cursor: string) => {
      const params = new URLSearchParams({ cursor, hashtag });
      const res = await fetch(`/api/feed?${params.toString()}`);
      return res.json();
    },
    [hashtag]
  );

  const { posts, isLoading, sentinelRef, hasMore } = useInfiniteFeed({
    initialPosts,
    initialCursor,
    fetchMore,
  });

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} isAdmin={isAdmin} />
      ))}
      {isLoading && <FeedSkeleton />}
      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}
