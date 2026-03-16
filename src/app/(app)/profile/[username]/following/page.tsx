import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile, getFollowing, getFollowCounts } from "@/lib/queries/profile";
import { profilePath } from "@/lib/utils/profile-path";
import { decodeRouteSegment } from "@/lib/utils/route-segment";
import { FollowList } from "@/components/profile/follow-list";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeRouteSegment(username);

  const profile = await getProfile(decodedUsername);
  if (!profile) {
    notFound();
  }

  const [following, counts] = await Promise.all([
    getFollowing(profile.id),
    getFollowCounts(profile.id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={profilePath(decodedUsername)}
          className="rounded-md p-1.5 transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Following</h1>
          <p className="text-sm text-muted-foreground">
            @{decodedUsername} &middot; {counts.following} Following
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <FollowList
          users={following}
          emptyMessage="Folgt noch niemandem."
        />
      </div>
    </div>
  );
}
