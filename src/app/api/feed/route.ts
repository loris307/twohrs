import { NextRequest, NextResponse } from "next/server";
import { getFeedByTab } from "@/lib/queries/posts";
import { FEED_TABS, DEFAULT_FEED_TAB } from "@/lib/constants";
import type { FeedTab } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const tabParam = request.nextUrl.searchParams.get("tab") || DEFAULT_FEED_TAB;

  const tab: FeedTab = FEED_TABS.includes(tabParam as FeedTab)
    ? (tabParam as FeedTab)
    : DEFAULT_FEED_TAB;

  try {
    const result = await getFeedByTab(tab, cursor);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { posts: [], nextCursor: null },
      { status: 500 }
    );
  }
}
