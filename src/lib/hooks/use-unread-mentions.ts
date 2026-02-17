"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadMentions(userId: string, initialCount: number) {
  const [count, setCount] = useState(initialCount);
  const supabaseRef = useRef(createClient());

  // Sync with server-rendered initial count on navigation
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  // Re-sync by querying Supabase directly (no Vercel API call)
  const resync = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      const { data: profile } = await supabase
        .from("profiles")
        .select("last_mentions_seen_at")
        .eq("id", userId)
        .single();

      if (!profile) return;

      const { count: freshCount } = await supabase
        .from("mentions")
        .select("*", { count: "exact", head: true })
        .eq("mentioned_user_id", userId)
        .gt("created_at", profile.last_mentions_seen_at);

      setCount(freshCount ?? 0);
    } catch {
      // ignore
    }
  }, [userId]);

  // Subscribe to Realtime INSERT events on mentions table
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`mentions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mentions",
          filter: `mentioned_user_id=eq.${userId}`,
        },
        () => {
          setCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Re-sync when tab becomes visible again (handles missed events)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        resync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [resync]);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  return { count, reset };
}
