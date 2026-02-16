import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import {
  getTopWinners,
  getTopFollowedProfiles,
} from "@/lib/queries/leaderboard";
import { formatNumber } from "@/lib/utils/format";
import {
  ArchiveTabs,
  type ArchiveTab,
} from "@/components/leaderboard/archive-tabs";
import type { TopWinner, TopFollowedProfile } from "@/lib/types";

export default async function LeaderboardHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab: ArchiveTab =
    params.tab === "followers" ? "followers" : "winners";

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
            Bestenliste
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All-Time Rankings
          </p>
        </div>
      </div>

      <ArchiveTabs active={activeTab} />

      <Suspense
        key={activeTab}
        fallback={
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
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
        {activeTab === "winners" ? <WinnersContent /> : <FollowersContent />}
      </Suspense>
    </div>
  );
}

async function WinnersContent() {
  const winners = await getTopWinners();

  if (winners.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch keine Tagessieger</p>
        <p className="mt-1 text-muted-foreground">
          Das Archiv wird jeden Abend nach der Session befüllt.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {winners.map((winner, index) => (
        <WinnerRow key={winner.user_id} winner={winner} rank={index + 1} />
      ))}
    </div>
  );
}

function WinnerRow({ winner, rank }: { winner: TopWinner; rank: number }) {
  return (
    <Link
      href={`/profile/${winner.profiles.username}`}
      className="flex items-center gap-4 rounded-md px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="w-8 text-center text-sm font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {winner.profiles.avatar_url ? (
          <Image
            src={winner.profiles.avatar_url}
            alt={winner.profiles.username}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          winner.profiles.username[0].toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {winner.profiles.display_name || winner.profiles.username}
        </p>
        <p className="text-xs text-muted-foreground">
          Letzter Sieg:{" "}
          {new Date(winner.last_win_date).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-right">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-bold tabular-nums">
          {formatNumber(winner.days_won)}
        </span>
      </div>
    </Link>
  );
}

async function FollowersContent() {
  const profiles = await getTopFollowedProfiles();

  if (profiles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Noch keine Follower</p>
        <p className="mt-1 text-muted-foreground">
          Folge anderen Nutzern, um dieses Ranking zu füllen.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {profiles.map((profile, index) => (
        <FollowerRow
          key={profile.user_id}
          profile={profile}
          rank={index + 1}
        />
      ))}
    </div>
  );
}

function FollowerRow({
  profile,
  rank,
}: {
  profile: TopFollowedProfile;
  rank: number;
}) {
  return (
    <Link
      href={`/profile/${profile.profiles.username}`}
      className="flex items-center gap-4 rounded-md px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="w-8 text-center text-sm font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {profile.profiles.avatar_url ? (
          <Image
            src={profile.profiles.avatar_url}
            alt={profile.profiles.username}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          profile.profiles.username[0].toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {profile.profiles.display_name || profile.profiles.username}
        </p>
        <p className="text-xs text-muted-foreground">
          @{profile.profiles.username}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-right">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-bold tabular-nums">
          {formatNumber(profile.follower_count)}
        </span>
      </div>
    </Link>
  );
}
