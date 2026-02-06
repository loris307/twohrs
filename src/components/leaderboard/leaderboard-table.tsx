import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardEntryRow } from "./leaderboard-entry";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch kein Ranking</p>
        <p className="mt-1 text-muted-foreground">
          Poste etwas und sammle Upvotes, um im Ranking zu erscheinen!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.length >= 1 && <LeaderboardPodium entries={entries} />}

      <div className="divide-y divide-border rounded-lg border border-border">
        {entries.map((entry, index) => (
          <LeaderboardEntryRow
            key={entry.user_id}
            entry={entry}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
