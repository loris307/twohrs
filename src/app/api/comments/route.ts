import { NextRequest, NextResponse } from "next/server";
import { getTopLevelCommentsPage } from "@/lib/queries/comments";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations";
import { COMMENT_DETAIL_TOP_LEVEL_LIMIT } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId");

  if (!postId) {
    return NextResponse.json(
      { comments: [], error: "postId is required" },
      { status: 400 }
    );
  }

  if (!uuidSchema.safeParse(postId).success) {
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

    const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? "0") || 0);
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? COMMENT_DETAIL_TOP_LEVEL_LIMIT) || COMMENT_DETAIL_TOP_LEVEL_LIMIT));

    const page = await getTopLevelCommentsPage(postId, offset, limit);
    return NextResponse.json({
      comments: page.comments,
      totalCount: page.totalCount,
      topLevelCount: page.topLevelCount,
      nextOffset: page.nextOffset,
      currentUserId: user.id,
    });
  } catch {
    return NextResponse.json({ comments: [] }, { status: 500 });
  }
}
