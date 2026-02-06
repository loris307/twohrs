import Link from "next/link";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
}

const medals = ["text-yellow-400", "text-gray-300", "text-amber-600"];
const sizes = ["h-20 w-20", "h-16 w-16", "h-16 w-16"];

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const top3 = entries.slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {/* Reorder: 2nd, 1st, 3rd for visual podium */}
      {[top3[1], top3[0], top3[2]]
        .filter(Boolean)
        .map((entry) => {
          const rank = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
          const isFirst = rank === 0;

          return (
            <Link
              key={entry.user_id}
              href={`/profile/${entry.profiles.username}`}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`relative flex items-center justify-center rounded-full bg-muted ${sizes[rank]}`}
              >
                {entry.profiles.avatar_url ? (
                  <Image
                    src={entry.profiles.avatar_url}
                    alt={entry.profiles.username}
                    width={80}
                    height={80}
                    className={`rounded-full object-cover ${sizes[rank]}`}
                  />
                ) : (
                  <span className="text-2xl font-bold">
                    {entry.profiles.username[0].toUpperCase()}
                  </span>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background ${medals[rank]}`}
                >
                  <Trophy className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-center">
                <p
                  className={`font-medium ${
                    isFirst ? "text-base" : "text-sm"
                  }`}
                >
                  {entry.profiles.display_name || entry.profiles.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(entry.total_upvotes)} Upvotes
                </p>
              </div>
              <div
                className={`w-20 rounded-t-md bg-card ${
                  isFirst ? "h-24" : rank === 1 ? "h-16" : "h-12"
                } flex items-center justify-center`}
              >
                <span className={`text-2xl font-bold ${medals[rank]}`}>
                  #{rank + 1}
                </span>
              </div>
            </Link>
          );
        })}
    </div>
  );
}
