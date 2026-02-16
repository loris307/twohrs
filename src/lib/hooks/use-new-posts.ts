"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { NEW_POSTS_POLL_INTERVAL } from "@/lib/constants";
import type { FeedTab } from "@/lib/constants";

interface UseNewPostsOptions {
  tab: FeedTab;
  newestPostTimestamp: string | null;
  enabled: boolean;
}

export function useNewPosts({
  tab,
  newestPostTimestamp,
  enabled,
}: UseNewPostsOptions) {
  const [newPostCount, setNewPostCount] = useState(0);
  const referenceTimestamp = useRef(newestPostTimestamp);
  const supabaseRef = useRef(createClient());

  // Cache followed user IDs and hashtag post IDs for "following" tab
  const followingIdsRef = useRef<string[]>([]);
  const followedHashtagsRef = useRef<string[]>([]);
  const followsCachedRef = useRef(false);

  // Reset when tab or initial data changes
  useEffect(() => {
    referenceTimestamp.current = newestPostTimestamp;
    setNewPostCount(0);
    followsCachedRef.current = false;
  }, [newestPostTimestamp, tab]);

  const fetchFollows = useCallback(async () => {
    if (followsCachedRef.current) return;

    const { data: { user } } = await supabaseRef.current.auth.getUser();
    if (!user) return;

    const [{ data: followRows }, { data: hashtagRows }] = await Promise.all([
      supabaseRef.current
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
      supabaseRef.current
        .from("hashtag_follows")
        .select("hashtag")
        .eq("user_id", user.id),
    ]);

    followingIdsRef.current = (followRows || []).map((f) => f.following_id);
    followedHashtagsRef.current = (hashtagRows || []).map((h) => h.hashtag);
    followsCachedRef.current = true;
  }, []);

  const checkForNewPosts = useCallback(async () => {
    if (!referenceTimestamp.current || !enabled) return;
    if (document.visibilityState === "hidden") return;

    try {
      if (tab === "following") {
        await fetchFollows();

        const followingIds = followingIdsRef.current;
        const followedHashtags = followedHashtagsRef.current;

        if (followingIds.length === 0 && followedHashtags.length === 0) {
          setNewPostCount(0);
          return;
        }

        // Get post IDs from followed hashtags that are newer than reference
        let hashtagPostIds: string[] = [];
        if (followedHashtags.length > 0) {
          const { data: hashtagPosts } = await supabaseRef.current
            .from("post_hashtags")
            .select("post_id")
            .in("hashtag", followedHashtags);

          hashtagPostIds = [...new Set((hashtagPosts || []).map((hp) => hp.post_id))];
        }

        // Count new posts from followed users OR with followed hashtags
        let query = supabaseRef.current
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gt("created_at", referenceTimestamp.current);

        if (followingIds.length > 0 && hashtagPostIds.length > 0) {
          query = query.or(
            `user_id.in.(${followingIds.join(",")}),id.in.(${hashtagPostIds.join(",")})`
          );
        } else if (followingIds.length > 0) {
          query = query.in("user_id", followingIds);
        } else {
          query = query.in("id", hashtagPostIds);
        }

        const { count } = await query;
        if (count !== null) {
          setNewPostCount(count);
        }
      } else {
        // "live" tab — count all new posts
        const { count } = await supabaseRef.current
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gt("created_at", referenceTimestamp.current);

        if (count !== null) {
          setNewPostCount(count);
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [tab, enabled, fetchFollows]);

  // Polling interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkForNewPosts, NEW_POSTS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkForNewPosts, enabled]);

  // Re-check when browser tab becomes visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForNewPosts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkForNewPosts, enabled]);

  const refresh = useCallback(() => {
    referenceTimestamp.current = new Date().toISOString();
    setNewPostCount(0);
  }, []);

  return {
    newPostCount,
    hasNewPosts: newPostCount > 0,
    refresh,
  };
}
