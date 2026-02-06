"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PostWithAuthor } from "@/lib/types";

interface UseInfiniteFeedOptions {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
  fetchMore: (cursor: string) => Promise<{
    posts: PostWithAuthor[];
    nextCursor: string | null;
  }>;
}

export function useInfiniteFeed({
  initialPosts,
  initialCursor,
  fetchMore,
}: UseInfiniteFeedOptions) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;

    setIsLoading(true);
    try {
      const result = await fetchMore(cursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setCursor(result.nextCursor);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, fetchMore]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && cursor && !isLoading) {
            loadMore();
          }
        },
        { rootMargin: "200px" }
      );

      if (node) observerRef.current.observe(node);
    },
    [loadMore, cursor, isLoading]
  );

  // Update posts when initialPosts change (e.g., revalidation)
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
  }, [initialPosts, initialCursor]);

  return { posts, isLoading, sentinelRef, hasMore: !!cursor };
}
