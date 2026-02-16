import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ users: [] });
  }

  // No query → show followed users
  if (q.length === 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (!follows || follows.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const followingIds = follows.map((f) => f.following_id);

    const { data: users } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followingIds)
      .order("username")
      .limit(20);

    return NextResponse.json({ users: users ?? [] });
  }

  // Has query → search ALL users, prefix match on username
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.${q}%,display_name.ilike.${q}%`)
    .neq("id", user.id)
    .order("username")
    .limit(20);

  if (error) {
    return NextResponse.json({ users: [] }, { status: 500 });
  }

  return NextResponse.json({ users: users ?? [] });
}
