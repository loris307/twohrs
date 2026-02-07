import { Suspense } from "react";
import Link from "next/link";
import { History, Crown } from "lucide-react";
import { getTodayLeaderboard } from "@/lib/queries/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wer ist heute am lustigsten?
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leaderboard/top-posts"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Crown className="h-4 w-4" />
            Hall of Fame
          </Link>
          <Link
            href="/leaderboard/history"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <History className="h-4 w-4" />
            Archiv
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-md px-4 py-3"
              >
                <div className="h-5 w-8 animate-pulse rounded bg-muted" />
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        }
      >
        <LeaderboardContent />
      </Suspense>
    </div>
  );
}

async function LeaderboardContent() {
  const entries = await getTodayLeaderboard();
  return <LeaderboardTable entries={entries} />;
}
