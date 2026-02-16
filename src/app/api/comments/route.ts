import { NextRequest, NextResponse } from "next/server";
import { getCommentsByPost, groupCommentsWithReplies } from "@/lib/queries/comments";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId");

  if (!postId) {
    return NextResponse.json(
      { comments: [], error: "postId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      isAdmin = profile?.is_admin ?? false;
    }

    const flat = await getCommentsByPost(postId);
    const comments = groupCommentsWithReplies(flat);
    return NextResponse.json({
      comments,
      currentUserId: user?.id ?? null,
      isAdmin,
    });
  } catch {
    return NextResponse.json({ comments: [] }, { status: 500 });
  }
}
