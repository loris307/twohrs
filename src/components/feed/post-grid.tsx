"use client";

import { useInfiniteFeed } from "@/lib/hooks/use-infinite-feed";
import { PostCard } from "./post-card";
import { FeedSkeleton } from "./feed-skeleton";
import type { PostWithAuthor } from "@/lib/types";

interface PostGridProps {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
}

async function fetchMorePosts(cursor: string) {
  const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
  return res.json();
}

export function PostGrid({ initialPosts, initialCursor }: PostGridProps) {
  const { posts, isLoading, sentinelRef, hasMore } = useInfiniteFeed({
    initialPosts,
    initialCursor,
    fetchMore: fetchMorePosts,
  });

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch keine Posts</p>
        <p className="mt-1 text-muted-foreground">
          Sei der Erste, der heute etwas postet!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {isLoading && <FeedSkeleton />}
      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}
