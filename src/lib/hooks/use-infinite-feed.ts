"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PostWithAuthor } from "@/lib/types";

const CACHE_KEY = "feed-cached-state";

interface CachedFeedState {
  posts: PostWithAuthor[];
  cursor: string | null;
}

interface UseInfiniteFeedOptions {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
  fetchMore: (cursor: string) => Promise<{
    posts: PostWithAuthor[];
    nextCursor: string | null;
  }>;
}

function getCachedState(): CachedFeedState | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedFeedState;
  } catch {
    return null;
  }
}

function saveCachedState(posts: PostWithAuthor[], cursor: string | null) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts, cursor }));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export function useInfiniteFeed({
  initialPosts,
  initialCursor,
  fetchMore,
}: UseInfiniteFeedOptions) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(() => {
    const cached = getCachedState();
    if (cached && cached.posts.length > initialPosts.length) {
      return cached.posts;
    }
    return initialPosts;
  });
  const [cursor, setCursor] = useState<string | null>(() => {
    const cached = getCachedState();
    if (cached && cached.posts.length > initialPosts.length) {
      return cached.cursor;
    }
    return initialCursor;
  });
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Clear cache after initial restore so it doesn't go stale
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!restoredRef.current) {
      restoredRef.current = true;
      sessionStorage.removeItem(CACHE_KEY);
    }
  }, []);

  // Listen for save-state event (dispatched right before navigating to a post)
  useEffect(() => {
    function handleSave() {
      saveCachedState(posts, cursor);
    }
    document.addEventListener("feed-save-state", handleSave);
    return () => document.removeEventListener("feed-save-state", handleSave);
  }, [posts, cursor]);

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
