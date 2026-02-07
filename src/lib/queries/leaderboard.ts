import { createClient } from "@/lib/supabase/server";
import type {
  LeaderboardEntry,
  DailyLeaderboardEntry,
  TopPostAllTime,
} from "@/lib/types";

export async function getTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Aggregate posts by user, ordered by total upvotes
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      user_id,
      upvote_count,
      profiles!posts_user_id_fkey (username, display_name, avatar_url)
    `
    )
    .order("upvote_count", { ascending: false });

  if (error || !data) return [];

  // Group by user and aggregate
  const userMap = new Map<
    string,
    {
      user_id: string;
      total_upvotes: number;
      post_count: number;
      profiles: LeaderboardEntry["profiles"];
    }
  >();

  for (const post of data) {
    const existing = userMap.get(post.user_id);
    if (existing) {
      existing.total_upvotes += post.upvote_count;
      existing.post_count += 1;
    } else {
      userMap.set(post.user_id, {
        user_id: post.user_id,
        total_upvotes: post.upvote_count,
        post_count: 1,
        profiles: post.profiles as unknown as LeaderboardEntry["profiles"],
      });
    }
  }

  return Array.from(userMap.values()).sort(
    (a, b) => b.total_upvotes - a.total_upvotes
  );
}

export async function getLeaderboardHistory(
  page: number = 0,
  pageSize: number = 30
): Promise<{
  entries: (DailyLeaderboardEntry & { profiles: DailyLeaderboardEntry["profiles"] })[];
  dates: string[];
}> {
  const supabase = await createClient();

  // Get distinct dates
  const { data: dateData } = await supabase
    .from("daily_leaderboard")
    .select("date")
    .order("date", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  const dates = [...new Set((dateData || []).map((d) => d.date))];

  if (dates.length === 0) {
    return { entries: [], dates: [] };
  }

  // Get entries for these dates
  const { data: entries } = await supabase
    .from("daily_leaderboard")
    .select(
      `
      *,
      profiles (username, display_name, avatar_url)
    `
    )
    .in("date", dates)
    .order("date", { ascending: false })
    .order("rank", { ascending: true });

  return {
    entries: (entries || []) as (DailyLeaderboardEntry & {
      profiles: DailyLeaderboardEntry["profiles"];
    })[],
    dates,
  };
}

export async function getTopPostsAllTime(): Promise<TopPostAllTime[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_posts_all_time")
    .select(
      `
      *,
      profiles (username, display_name, avatar_url)
    `
    )
    .order("upvote_count", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data as unknown as TopPostAllTime[];
}
