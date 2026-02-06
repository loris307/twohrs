import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { getLeaderboardHistory } from "@/lib/queries/leaderboard";

export default function LeaderboardHistoryPage() {
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
            Leaderboard-Archiv
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vergangene Tagessieger
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        }
      >
        <HistoryContent />
      </Suspense>
    </div>
  );
}

async function HistoryContent() {
  const { entries, dates } = await getLeaderboardHistory();

  if (dates.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch kein Archiv</p>
        <p className="mt-1 text-muted-foreground">
          Das Archiv wird jeden Abend nach der Session befüllt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const dayEntries = entries
          .filter((e) => e.date === date)
          .sort((a, b) => a.rank - b.rank);
        const winner = dayEntries[0];

        return (
          <div
            key={date}
            className="flex items-center gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400/10">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {new Date(date).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {winner && (
                <p className="text-xs text-muted-foreground">
                  Gewinner: @{winner.profiles.username} mit{" "}
                  {winner.total_upvotes} Upvotes
                </p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {dayEntries.length} Teilnehmer
            </div>
          </div>
        );
      })}
    </div>
  );
}
