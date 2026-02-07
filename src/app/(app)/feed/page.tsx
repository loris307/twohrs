import { Suspense } from "react";
import Link from "next/link";
import { PlusSquare } from "lucide-react";
import { getFeedByTab } from "@/lib/queries/posts";
import { PostGrid } from "@/components/feed/post-grid";
import { FeedTabs } from "@/components/feed/feed-tabs";
import { FeedSkeleton } from "@/components/feed/feed-skeleton";
import { FEED_TABS, DEFAULT_FEED_TAB } from "@/lib/constants";
import type { FeedTab } from "@/lib/constants";

interface FeedPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const tabParam = params.tab || DEFAULT_FEED_TAB;
  const tab: FeedTab = FEED_TABS.includes(tabParam as FeedTab)
    ? (tabParam as FeedTab)
    : DEFAULT_FEED_TAB;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusSquare className="h-4 w-4" />
          Posten
        </Link>
      </div>

      <FeedTabs activeTab={tab} />

      <Suspense key={tab} fallback={<FeedSkeleton />}>
        <FeedContent tab={tab} />
      </Suspense>
    </div>
  );
}

async function FeedContent({ tab }: { tab: FeedTab }) {
  const { posts, nextCursor } = await getFeedByTab(tab);

  return <PostGrid initialPosts={posts} initialCursor={nextCursor} tab={tab} />;
}
