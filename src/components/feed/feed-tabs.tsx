"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Users, Flame, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NEW_POSTS_POLL_INTERVAL } from "@/lib/constants";
import type { FeedTab } from "@/lib/constants";

const tabs: { value: FeedTab; label: string; icon: typeof Users }[] = [
  { value: "following", label: "Folgend", icon: Users },
  { value: "hot", label: "Hot", icon: Flame },
  { value: "live", label: "Live", icon: Radio },
];

interface FeedTabsProps {
  activeTab: FeedTab;
}

export function FeedTabs({ activeTab }: FeedTabsProps) {
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const referenceTimestamp = useRef(new Date().toISOString());
  const supabaseRef = useRef(createClient());

  // Cache follows for "following" badge
  const followingIdsRef = useRef<string[]>([]);
  const followedHashtagsRef = useRef<string[]>([]);
  const followsCachedRef = useRef(false);

  // Reset on tab change
  useEffect(() => {
    referenceTimestamp.current = new Date().toISOString();
    setBadgeCounts({});
    followsCachedRef.current = false;
  }, [activeTab]);

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

  const pollBadges = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    const ref = referenceTimestamp.current;

    const counts: Record<string, number> = {};

    // Poll "live" badge (if not on live tab)
    if (activeTab !== "live") {
      try {
        const { count } = await supabaseRef.current
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gt("created_at", ref);

        if (count !== null && count > 0) counts.live = count;
      } catch {}
    }

    // Poll "following" badge (if not on following tab)
    if (activeTab !== "following") {
      try {
        await fetchFollows();

        const followingIds = followingIdsRef.current;
        const followedHashtags = followedHashtagsRef.current;

        if (followingIds.length > 0 || followedHashtags.length > 0) {
          let hashtagPostIds: string[] = [];
          if (followedHashtags.length > 0) {
            const { data: hashtagPosts } = await supabaseRef.current
              .from("post_hashtags")
              .select("post_id")
              .in("hashtag", followedHashtags);

            hashtagPostIds = [...new Set((hashtagPosts || []).map((hp) => hp.post_id))];
          }

          let query = supabaseRef.current
            .from("posts")
            .select("*", { count: "exact", head: true })
            .gt("created_at", ref);

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
          if (count !== null && count > 0) counts.following = count;
        }
      } catch {}
    }

    setBadgeCounts(counts);
  }, [activeTab, fetchFollows]);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(pollBadges, NEW_POSTS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollBadges]);

  // Re-check on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        pollBadges();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pollBadges]);

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;
        const badge = !isActive ? badgeCounts[tab.value] : undefined;
        const href =
          tab.value === "live" ? "/feed" : `/feed?tab=${tab.value}`;

        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {badge && badge > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
