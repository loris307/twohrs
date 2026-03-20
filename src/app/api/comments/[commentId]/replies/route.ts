import { NextRequest, NextResponse } from "next/server";
import { getCommentRepliesPage } from "@/lib/queries/comments";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations";
import { COMMENT_REPLIES_PAGE_SIZE } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { commentId } = await params;
  if (!uuidSchema.safeParse(commentId).success) {
    return NextResponse.json({ error: "Ungueltige Kommentar-ID" }, { status: 400 });
  }

  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? "0") || 0);
  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? COMMENT_REPLIES_PAGE_SIZE) || COMMENT_REPLIES_PAGE_SIZE));

  try {
    const page = await getCommentRepliesPage(commentId, offset, limit);
    return NextResponse.json({
      parentId: commentId,
      replies: page.comments,
      totalCount: page.totalCount,
      nextOffset: page.nextOffset,
    });
  } catch {
    return NextResponse.json({ replies: [] }, { status: 500 });
  }
}
