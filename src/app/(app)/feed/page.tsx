import { Suspense } from "react";
import Link from "next/link";
import { PlusSquare } from "lucide-react";
import { getFeed } from "@/lib/queries/posts";
import { PostGrid } from "@/components/feed/post-grid";
import { FeedSkeleton } from "@/components/feed/feed-skeleton";

export default function FeedPage() {
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

      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent />
      </Suspense>
    </div>
  );
}

async function FeedContent() {
  const { posts, nextCursor } = await getFeed();

  return <PostGrid initialPosts={posts} initialCursor={nextCursor} />;
}
