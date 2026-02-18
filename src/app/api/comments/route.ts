import { NextRequest, NextResponse } from "next/server";
import { getCommentsByPost, groupCommentsWithReplies } from "@/lib/queries/comments";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId");

  if (!postId) {
    return NextResponse.json(
      { comments: [], error: "postId is required" },
      { status: 400 }
    );
  }

  const parsed = uuidSchema.safeParse(postId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const flat = await getCommentsByPost(postId);
    const comments = groupCommentsWithReplies(flat);
    return NextResponse.json({
      comments,
      currentUserId: user.id,
    });
  } catch {
    return NextResponse.json({ comments: [] }, { status: 500 });
  }
}
