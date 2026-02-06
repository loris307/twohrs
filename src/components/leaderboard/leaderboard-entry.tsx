import Link from "next/link";
import Image from "next/image";
import { formatNumber } from "@/lib/utils/format";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardEntryRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

export function LeaderboardEntryRow({ entry, rank }: LeaderboardEntryRowProps) {
  return (
    <Link
      href={`/profile/${entry.profiles.username}`}
      className="flex items-center gap-4 rounded-md px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="w-8 text-center text-sm font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {entry.profiles.avatar_url ? (
          <Image
            src={entry.profiles.avatar_url}
            alt={entry.profiles.username}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          entry.profiles.username[0].toUpperCase()
        )}
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">
          {entry.profiles.display_name || entry.profiles.username}
        </p>
        <p className="text-xs text-muted-foreground">
          @{entry.profiles.username}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-bold tabular-nums">
          {formatNumber(entry.total_upvotes)}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.post_count} {entry.post_count === 1 ? "Post" : "Posts"}
        </p>
      </div>
    </Link>
  );
}
