import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LeaderboardEntry,
  DailyLeaderboardEntry,
  TopPostAllTime,
  TopComment,
  TopWinner,
  TopFollowedProfile,
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
    (a, b) => b.total_upvotes - a.total_upvotes || a.post_count - b.post_count
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

export async function getTopWinners(): Promise<TopWinner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_leaderboard")
    .select(
      `
      user_id,
      date,
      profiles (username, display_name, avatar_url)
    `
    )
    .eq("rank", 1)
    .order("date", { ascending: false });

  if (error || !data) return [];

  // Group by user: count wins, get latest win date
  const userMap = new Map<
    string,
    {
      user_id: string;
      days_won: number;
      last_win_date: string;
      profiles: TopWinner["profiles"];
    }
  >();

  for (const entry of data) {
    const existing = userMap.get(entry.user_id);
    if (existing) {
      existing.days_won += 1;
    } else {
      userMap.set(entry.user_id, {
        user_id: entry.user_id,
        days_won: 1,
        last_win_date: entry.date,
        profiles: entry.profiles as unknown as TopWinner["profiles"],
      });
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.days_won - a.days_won);
}

export async function getTopFollowedProfiles(
  limit: number = 20
): Promise<TopFollowedProfile[]> {
  const supabase = await createClient();

  // Get all follow relationships
  const { data: follows, error } = await supabase
    .from("follows")
    .select("following_id");

  if (error || !follows) return [];

  // Count followers per user
  const countMap = new Map<string, number>();
  for (const row of follows) {
    countMap.set(row.following_id, (countMap.get(row.following_id) || 0) + 1);
  }

  // Sort and take top N
  const topUserIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));

  if (topUserIds.length === 0) return [];

  // Fetch profiles for these users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in(
      "id",
      topUserIds.map((u) => u.id)
    );

  if (!profiles) return [];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return topUserIds
    .map((u) => {
      const profile = profileMap.get(u.id);
      if (!profile) return null;
      return {
        user_id: u.id,
        follower_count: u.count,
        profiles: {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      };
    })
    .filter((entry): entry is TopFollowedProfile => entry !== null);
}

export async function getLatestTopPost(): Promise<TopPostAllTime | null> {
  const supabase = createAdminClient();

  // First: check if there are live posts (session just ended, not yet cleaned up)
  const { data: livePost } = await supabase
    .from("posts")
    .select(
      `
      id, user_id, image_url, image_path, caption, upvote_count, created_at,
      og_title, og_description, og_image, og_url,
      profiles (username, display_name, avatar_url)
    `
    )
    .order("upvote_count", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (livePost && livePost.upvote_count > 0) {
    // Get top 3 comments for this post
    const { data: comments } = await supabase
      .from("comments")
      .select(
        `
        text, upvote_count,
        profiles (username)
      `
      )
      .eq("post_id", livePost.id)
      .is("parent_comment_id", null)
      .order("upvote_count", { ascending: false })
      .limit(3);

    const topComments: TopComment[] = (comments || []).map((c) => ({
      username: (c.profiles as unknown as { username: string }).username,
      text: c.text,
      upvote_count: c.upvote_count,
    }));

    return {
      id: livePost.id,
      date: new Date().toISOString().split("T")[0],
      user_id: livePost.user_id,
      image_url: livePost.image_url,
      image_path: livePost.image_path,
      caption: livePost.caption,
      upvote_count: livePost.upvote_count,
      created_at: livePost.created_at,
      og_title: livePost.og_title ?? null,
      og_description: livePost.og_description ?? null,
      og_image: livePost.og_image ?? null,
      og_url: livePost.og_url ?? null,
      top_comments: topComments,
      profiles: livePost.profiles as unknown as TopPostAllTime["profiles"],
    };
  }

  // Fallback: get from archived top posts
  const { data, error } = await supabase
    .from("top_posts_all_time")
    .select(
      `
      *,
      profiles (username, display_name, avatar_url)
    `
    )
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return data as unknown as TopPostAllTime;
}
