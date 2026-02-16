import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile, getFollowers, getFollowCounts } from "@/lib/queries/profile";
import { FollowList } from "@/components/profile/follow-list";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getProfile(username);
  if (!profile) {
    notFound();
  }

  const [followers, counts] = await Promise.all([
    getFollowers(profile.id),
    getFollowCounts(profile.id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${username}`}
          className="rounded-md p-1.5 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Follower</h1>
          <p className="text-sm text-muted-foreground">
            @{username} &middot; {counts.followers} Follower
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <FollowList
          users={followers}
          emptyMessage="Noch keine Follower."
        />
      </div>
    </div>
  );
}
