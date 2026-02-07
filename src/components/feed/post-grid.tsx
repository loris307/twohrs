"use client";

import { useCallback } from "react";
import { useInfiniteFeed } from "@/lib/hooks/use-infinite-feed";
import { PostCard } from "./post-card";
import { FeedSkeleton } from "./feed-skeleton";
import type { PostWithAuthor } from "@/lib/types";
import type { FeedTab } from "@/lib/constants";

interface PostGridProps {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
  tab?: FeedTab;
}

export function PostGrid({
  initialPosts,
  initialCursor,
  tab = "live",
}: PostGridProps) {
  const fetchMore = useCallback(
    async (cursor: string) => {
      const params = new URLSearchParams({ cursor });
      if (tab !== "live") {
        params.set("tab", tab);
      }
      const res = await fetch(`/api/feed?${params.toString()}`);
      return res.json();
    },
    [tab]
  );

  const { posts, isLoading, sentinelRef, hasMore } = useInfiniteFeed({
    initialPosts,
    initialCursor,
    fetchMore,
  });

  if (posts.length === 0) {
    return <FeedEmptyState tab={tab} />;
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

function FeedEmptyState({ tab }: { tab: FeedTab }) {
  const messages: Record<FeedTab, { title: string; subtitle: string }> = {
    following: {
      title: "Noch keine Posts",
      subtitle: "Folge anderen Nutzern, um ihre Posts hier zu sehen!",
    },
    hot: {
      title: "Noch keine Hot Posts",
      subtitle: "Posts mit genug Likes erscheinen hier.",
    },
    live: {
      title: "Noch keine Posts",
      subtitle: "Sei der Erste, der heute etwas postet!",
    },
  };

  const { title, subtitle } = messages[tab];

  return (
    <div className="py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
