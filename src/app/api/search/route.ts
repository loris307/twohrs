import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const supabase = await createClient();

  // Hashtag search mode
  if (q.startsWith("#")) {
    const hashtagQuery = q.slice(1).toLowerCase();
    if (!hashtagQuery) {
      return NextResponse.json({ hashtags: [] });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Use DB function for efficient GROUP BY
    const { data: results, error } = await supabase.rpc("search_hashtags", {
      query_prefix: hashtagQuery,
    });

    if (error) {
      return NextResponse.json({ hashtags: [] }, { status: 500 });
    }

    // Check which hashtags the user follows
    let followedHashtags = new Set<string>();
    if (user) {
      const { data: follows } = await supabase
        .from("hashtag_follows")
        .select("hashtag")
        .eq("user_id", user.id);
      followedHashtags = new Set((follows ?? []).map((f) => f.hashtag));
    }

    const hashtags = (results ?? []).map((r: { hashtag: string; post_count: number }) => ({
      hashtag: r.hashtag,
      postCount: Number(r.post_count),
      isFollowed: followedHashtags.has(r.hashtag),
    }));

    return NextResponse.json({ hashtags });
  }

  // User search mode (existing behavior)
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.${q}%,display_name.ilike.${q}%`)
    .order("username")
    .limit(20);

  if (error) {
    return NextResponse.json({ users: [] }, { status: 500 });
  }

  return NextResponse.json({ users: users ?? [] });
}
