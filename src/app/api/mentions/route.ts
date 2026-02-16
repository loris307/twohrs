import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMentionedPosts } from "@/lib/queries/mentions";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ posts: [], unreadPostIds: [] });
  }

  const { posts, unreadPostIds } = await getMentionedPosts(user.id);
  return NextResponse.json({ posts, unreadPostIds });
}
