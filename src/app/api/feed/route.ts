import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/queries/posts";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;

  try {
    const result = await getFeed(cursor);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { posts: [], nextCursor: null },
      { status: 500 }
    );
  }
}
