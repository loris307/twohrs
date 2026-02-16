import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Gather all user data (admin client bypasses RLS + time gate)
  const [
    profileResult,
    postsResult,
    commentsResult,
    votesResult,
    commentVotesResult,
    followingResult,
    followersResult,
    leaderboardResult,
    hashtagFollowsResult,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin.from("posts").select("*").eq("user_id", user.id),
    admin.from("comments").select("*").eq("user_id", user.id),
    admin.from("votes").select("*").eq("user_id", user.id),
    admin.from("comment_votes").select("*").eq("user_id", user.id),
    admin
      .from("follows")
      .select("following_id, profiles!follows_following_id_fkey(username)")
      .eq("follower_id", user.id),
    admin
      .from("follows")
      .select("follower_id, profiles!follows_follower_id_fkey(username)")
      .eq("following_id", user.id),
    admin
      .from("daily_leaderboard")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    admin
      .from("hashtag_follows")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    auth: {
      email: user.email,
      created_at: user.created_at,
    },
    profile: profileResult.data,
    posts: postsResult.data ?? [],
    comments: commentsResult.data ?? [],
    votes: votesResult.data ?? [],
    commentVotes: commentVotesResult.data ?? [],
    follows: {
      following: followingResult.data ?? [],
      followers: followersResult.data ?? [],
    },
    hashtagFollows: hashtagFollowsResult.data ?? [],
    leaderboardHistory: leaderboardResult.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="2hours-daten-export.json"',
    },
  });
}
