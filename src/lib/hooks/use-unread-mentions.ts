"use client";

import { useState, useEffect } from "react";

export function useUnreadMentions(initialCount: number) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    // Poll every 30 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/mentions/unread");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {
        // ignore
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // Sync with initial count when it changes (e.g. navigation)
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  return count;
}
