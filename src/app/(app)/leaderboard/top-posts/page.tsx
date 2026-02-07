import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTopPostsAllTime } from "@/lib/queries/leaderboard";
import { TopPostCard } from "@/components/leaderboard/top-post-card";

export default function TopPostsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/leaderboard"
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hall of Fame
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Die besten Posts aller Zeiten
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        }
      >
        <TopPostsContent />
      </Suspense>
    </div>
  );
}

async function TopPostsContent() {
  const posts = await getTopPostsAllTime();

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch keine Top Posts</p>
        <p className="mt-1 text-muted-foreground">
          Jeden Tag wird der beste Post hier verewigt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <TopPostCard key={post.id} post={post} rank={index + 1} />
      ))}
    </div>
  );
}
